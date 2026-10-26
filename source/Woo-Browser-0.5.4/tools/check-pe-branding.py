"""Read PE resources; prove metadata-only edits preserve icon/manifest bytes."""
import sys, struct, mmap, hashlib, json

def resources(filename):
    with open(filename, 'rb') as f, mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as b:
        pe = struct.unpack_from('<I', b, 0x3c)[0]
        assert b[pe:pe+4] == b'PE\0\0'
        sections = struct.unpack_from('<H', b, pe+6)[0]
        optsize = struct.unpack_from('<H', b, pe+20)[0]
        opt = pe+24
        datadir = opt + (112 if struct.unpack_from('<H',b,opt)[0] == 0x20b else 96)
        rrva = struct.unpack_from('<I',b,datadir+16)[0]
        table=opt+optsize
        def offset(rva):
            for i in range(sections):
                s=table+40*i
                virtual_size,va,size,ptr=struct.unpack_from('<IIII',b,s+8)
                if va <= rva < va+max(virtual_size,size): return ptr+rva-va
            raise ValueError('Unmapped RVA')
        root=offset(rrva); result={}
        def walk(relative,keys=()):
            pos=root+relative
            named,ids=struct.unpack_from('<HH',b,pos+12)
            for i in range(named+ids):
                label,target=struct.unpack_from('<II',b,pos+16+8*i)
                if label & 0x80000000:
                    x=root+(label&0x7fffffff); n=struct.unpack_from('<H',b,x)[0]
                    label=b[x+2:x+2+2*n].decode('utf-16le')
                route=keys+(label,)
                if target&0x80000000: walk(target&0x7fffffff,route)
                else:
                    rva,size=struct.unpack_from('<II',b,root+target)
                    if route[0] in (3,14,24):
                        result['/'.join(map(str,route))]=hashlib.sha256(b[offset(rva):offset(rva)+size]).hexdigest()
        walk(0)
        return result

old,new=map(resources,sys.argv[1:3])
assert old and any(x.startswith('3/') for x in old), 'Missing original icon resources'
assert {k:v for k,v in old.items() if k.startswith('24/')} == {k:v for k,v in new.items() if k.startswith('24/')}, 'Execution manifest changed'
assert {k:v for k,v in old.items() if k.startswith('3/')} != {k:v for k,v in new.items() if k.startswith('3/')}, 'Icon not replaced'
print(json.dumps({'iconReplacedManifestUnchanged':True,'resourceHashes':new},indent=2))
