> RELEASE STATE 0.5.0: New domain/alias/site-identity creation is temporarily CLOSED in the packaged app. Creation examples below describe development fixtures or future approved operation, not actions an AI should enable. Normal public HTTPS browsing and explicit web search work. Existing recent projects and verified snapshots remain available; signing remains temporary.

# Examples for builders

## A static starter

    <!doctype html>
    <html lang="en">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>My local studio</title>
    <link rel="stylesheet" href="style.css">
    <main><h1>My local studio</h1><p>A local Woo preview.</p></main>
    </html>

Put this in index.html beside style.css. No inline script is required. To add JavaScript, use a supported local .js file. Do not assume external fetch, forms, workers or Node will be permitted in the verified native site mode. Use browser storage only within the assigned origin; new owners/generations receive different origins.

## Registry metadata example

    {"name":"studio.woo","destination":"https://example.com/","owner":"local-operator","note":"Example destination, not owned by this project","title":"Studio notes","description":"Design sketches and project notes","aliases":["sketchbook","notes"]}

This is an HTTPS alias metadata example, not native hosting or proof of ownership. Import it through a version-1 snapshot only if it does not conflict. The actual destination remains visible before/after selection. Do not use a private IP or file URL.

## Local custom ranking/provider

    const {createSearch}=require('./sdk/search.cjs');
    const search=createSearch({
      includeDefaults:false,
      aliases:[{title:'My manual',names:['manual','handbook'],
                url:'https://example.com/',kind:'User curated example'}],
      weights:{exact:200,prefix:90,token:60,typo:20}
    });
    console.log(search.suggest('handbook'));

This runs as trusted local code. It is not a permission for a remote page or declarative plugin to execute Node. The default client still validates navigation destinations.

## A custom discovery input

    const {createProvider}=require('./sdk/discovery.cjs');
    const provider=createProvider({readRegistry:()=>myValidatedRecords,
                                   readPublished:()=>myTrustedPublicMetadata});
    console.log(provider.search('woodshop'));

The variables are placeholders supplied by your application. Validate data, label source/scope and preserve ownership trust separately. Do not index local file bodies unless the human expressly wants that and understands exposure/retention.

## A useful AI task

"Read this Woo 0.5.0 documentation bundle. In my selected static site folder, add a local navigation menu and an accessible contact-information page using HTML/CSS only. Preserve the existing files. Do not deploy, create accounts/keys, install packages or send data to any external service. Validate supported file names and explain how I refresh the local preview."

A request like this is concrete and bounded. The AI should inspect the selected files, propose/edit within scope, validate, and explain limitations. It should not reinterpret it as authorization for public hosting or credentials.
