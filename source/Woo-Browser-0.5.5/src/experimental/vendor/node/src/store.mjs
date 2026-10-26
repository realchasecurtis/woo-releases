import {LIMITS, verifyRecord, recordId, verifyBundle, b64} from './protocol.mjs';

export class Store {
  #records = new Map();
  #bundles = new Map();
  #conflicts = new Set();
  #evidence = new Map();
  #bytes = 0;
  #retentionGeneration = 0;
  #retentionConsent = false;
  #consentGeneration = 0;
  get retainPublic() { return this.#retentionConsent; }
  set retainPublic(value) {
    if (typeof value !== 'boolean') throw Error('Boolean retention consent required');
    if (value !== this.#retentionConsent) this.#consentGeneration++;
    this.#retentionConsent = value;
  }

  constructor({retainPublic = false, quota = 4 * 1024 * 1024, maxRecords = LIMITS.records} = {}) {
    if (!Number.isSafeInteger(quota) || quota < 0 || !Number.isSafeInteger(maxRecords) ||
        maxRecords < 1 || maxRecords > LIMITS.records) throw Error('Invalid quota');
    this.retainPublic = retainPublic;
    this.quota = quota;
    this.maxRecords = maxRecords;
  }

  // No admission and no mutation. Intended for filtering transient candidates.
  checkKnown(record) {
    const p = verifyRecord(record), old = this.#records.get(p.siteId);
    if (!old) return false;
    if (this.#conflicts.has(p.siteId)) throw Error('Owner conflict quarantined');
    if (p.revision < old.payload.revision) throw Error('Stale revision');
    if (p.revision === old.payload.revision && recordId(old) !== recordId(record)) {
      throw Error('Conflicting owner records');
    }
    return true;
  }

  // Discovery may update prior explicit trust, but cannot add a new identity.
  observeKnown(record) {
    const p = verifyRecord(record);
    if (!this.#records.has(p.siteId)) return false;
    this.accept(record);
    return true;
  }

  // Explicit trusted/operator admission API, never called for unfamiliar search hits.
  accept(record) {
    const p = verifyRecord(record), old = this.#records.get(p.siteId);
    if (old && !this.#conflicts.has(p.siteId) && p.revision === old.payload.revision &&
        recordId(old) !== recordId(record)) {
      this.#conflicts.add(p.siteId);
      this.#evidence.set(p.siteId, structuredClone([old, record]));
      throw Error('Conflicting owner records');
    }
    this.checkKnown(record);
    if (!old && this.#records.size >= this.maxRecords) throw Error('Record quota');
    this.#records.set(p.siteId, structuredClone(record));
  }

  retain(record, bytes, {pin = false, share = false} = {}) {
    verifyRecord(record);
    verifyBundle(bytes, record.payload.root);
    if (share && !this.retainPublic) throw Error('Public retention requires opt-in');
    const root = record.payload.root, old = this.#bundles.get(root);
    if (!old && bytes.length > this.quota) throw Error('Bundle quota');
    if (!old && this.#bundles.size >= LIMITS.records) throw Error('Retained bundle count quota');
    let needed = this.#bytes + (old ? 0 : bytes.length) - this.quota;
    const evict = [];
    for (const [id, b] of this.#bundles) {
      if (needed <= 0) break;
      if (!b.pin && id !== root) { evict.push(id); needed -= b.bytes.length; }
    }
    if (needed > 0) throw Error('Pinned quota exhausted');
    this.accept(record);
    for (const id of evict) {
      this.#bytes -= this.#bundles.get(id).bytes.length;
      this.#bundles.delete(id);
    }
    if (!old) this.#bytes += bytes.length;
    this.#bundles.set(root, {record: structuredClone(record), bytes: Buffer.from(bytes),
      pin: pin || old?.pin || false, share: share || old?.share || false,
      generation: old?.generation ?? ++this.#retentionGeneration});
  }

  search(query, {publicOnly = false} = {}) {
    if (typeof query !== 'string' || query.length > 256) throw Error('Invalid query');
    const q = query.normalize('NFKC').trim().toLowerCase();
    if (!q) return [];
    return [...this.#records.values()].filter(r => !this.#conflicts.has(r.payload.siteId) &&
      (!publicOnly || this.retainPublic) && [r.payload.siteId, ...Object.values(r.payload.descriptor)]
        .join(' ').normalize('NFKC').toLowerCase().includes(q)).map(r => structuredClone(r));
  }

  get(root, {publicOnly = false} = {}) {
    const b = this.#bundles.get(root);
    if (!b || (publicOnly && (!b.share || !this.retainPublic))) throw Error('Replica unavailable');
    return Buffer.from(b.bytes);
  }

  open(record, path = '/index.html') {
    this.checkKnown(record);
    const files = verifyBundle(this.get(record.payload.root), record.payload.root);
    const file = files.get(path);
    if (!file) throw Error('Path unavailable');
    this.accept(record);
    return file;
  }

  evict(root) {
    const b = this.#bundles.get(root);
    if (b?.pin) throw Error('Pinned retention');
    if (b) { this.#bytes -= b.bytes.length; this.#bundles.delete(root); }
  }

  contributionStatus(root) {
    const b = this.#bundles.get(root);
    if (!this.retainPublic || !b?.share || !b.pin) throw Error('Explicit public pinned retention required');
    verifyBundle(b.bytes, root);
    return {bytes: b.bytes.length, generation: this.#consentGeneration + ':' + b.generation};
  }

  snapshot() {
    return {version: 2, records: structuredClone([...this.#records.values()]),
      conflicts: [...this.#conflicts], evidence: structuredClone([...this.#evidence.values()]),
      bundles: [...this.#bundles].map(([root, b]) => ({root, record: structuredClone(b.record),
        data: b.bytes.toString('base64'), pin: b.pin}))};
  }

  static restore(s, {trustLegacySnapshot = false, ...options} = {}) {
    if (s.version === 1 && !trustLegacySnapshot) {
      throw Error('Legacy snapshot requires explicit reviewed trust admission');
    }
    if (![1, 2].includes(s.version) || !Array.isArray(s.records) || !Array.isArray(s.bundles) ||
        !Array.isArray(s.conflicts) || s.records.length > LIMITS.records ||
        s.bundles.length > LIMITS.records || s.conflicts.length > LIMITS.records ||
        (s.version === 2 && (!Array.isArray(s.evidence) || s.evidence.length > LIMITS.records))) {
      throw Error('Invalid snapshot');
    }
    const store = new Store(options);
    for (const r of s.records) store.accept(r);
    for (const b of s.bundles) {
      const p = verifyRecord(b.record), current = store.#records.get(p.siteId);
      if (!current || p.root !== b.root || p.revision > current.payload.revision ||
          typeof b.pin !== 'boolean' || store.#bundles.has(b.root)) throw Error('Invalid snapshot bundle');
      if (p.revision === current.payload.revision && recordId(b.record) !== recordId(current)) {
        throw Error('Conflicting snapshot');
      }
      const bytes = b64(b.data, LIMITS.bundle);
      verifyBundle(bytes, b.root);
      if (store.#bytes + bytes.length > store.quota) throw Error('Snapshot quota');
      store.#bytes += bytes.length;
      store.#bundles.set(b.root, {record: structuredClone(b.record), bytes, pin: b.pin, share: false});
    }
    for (const id of s.conflicts) {
      if (!store.#records.has(id)) throw Error('Invalid conflict ID');
      store.#conflicts.add(id);
    }
    for (const pair of s.evidence ?? []) {
      if (!Array.isArray(pair) || pair.length !== 2) throw Error('Invalid conflict evidence');
      const a = verifyRecord(pair[0]), b = verifyRecord(pair[1]);
      if (a.siteId !== b.siteId || a.revision !== b.revision ||
          recordId(pair[0]) === recordId(pair[1]) || !store.#conflicts.has(a.siteId) ||
          store.#evidence.has(a.siteId)) throw Error('Invalid conflict evidence');
      store.#evidence.set(a.siteId, structuredClone(pair));
    }
    return store;
  }
}



