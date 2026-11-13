# realestate.munot.app

Cloudflare Worker (ohne Build-Schritt) auf der D1 `realestate`.

Seiten: `/` Übersicht, `/profil/:id`, `/vergleich?ids=1,2` (+ `&format=csv`), `/news?cat=`
API: `/api/companies`, `/api/company/:id`, `/api/compare?ids=`

## Deploy
    npm i -g wrangler        # falls nötig
    wrangler login
    wrangler deploy          # setzt Custom Domain realestate.munot.app

Danach in Cloudflare Zero Trust eine Access-Application für `realestate.munot.app`
anlegen (E-Mail-Login), damit die Daten privat bleiben.

`schema.sql` enthält Tabellen und Views (nur zur Dokumentation / für ein lokales `wrangler d1 execute --local`).
