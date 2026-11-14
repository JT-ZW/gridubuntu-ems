# Grid Ubuntu — SvelteKit migration

The marketing website reproduces the existing Grid Ubuntu design using native Svelte components and the original stylesheet, fonts, imagery, product screenshots, and team photographs.

## Run

`npm install`
`npm run dev`

## Validate and build

`npm run check`
`npm run build`

The static production output is generated in `build/`.

## Pages

Home `/`, Product `/product`, Impact `/impact`, About `/about`, Team `/team`, Contact `/contact`.

Earlier page URLs redirect to their corresponding original pages. Household Portal links lead to the existing operational website. Product screens are screenshots, not a connected EMS. The contact form validates inputs and opens an email draft addressed to the contact published on the original website; visitors review and send it in their email app. Live metrics are not connected in this marketing build.

Original design and assets: https://gridubuntu-frontend.fly.dev/
