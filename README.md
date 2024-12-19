<div align="center">
  <h1>gatsby-strava-tiles</h1>
  <br/>
  <p>
    <img src="./logo.png" alt="gatsby-strava-tiles" height="100px">
  </p>
  <br/>

[![Npm version][badge-npm]][npm]
[![Npm downloads][badge-npm-dl]][npm]
[![MIT license][badge-licence]](./LICENCE.md)
[![PRs welcome][badge-prs-welcome]](#contributing)

</div>

---

Gatsby plugin add tiles to Strava data

## Usage

1. Download [gatsby-source-strava][gatsby-source-strava] and `gatsby-strava-tiles` from the NPM registry:

```shell
yarn add gatsby-source-strava gatsby-strava-tiles
```

2.  Add [gatsby-source-strava][gatsby-source-strava] and `gatsby-strava-tiles` plugin in your `gatsby-config.js` file

```js
require("dotenv").config()

module.exports = {
    plugins: [
        "gatsby-source-strava", // MANDATORY
        //
        // It MUST be after `gatsby-source-strava` source plugin
        "gatsby-strava-tiles",
    ],
}
```

> [gatsby-source-strava][gatsby-source-strava] needs `clientId`, `clientSecret` and `token` options to works.
>
> Checkout [documentation][gatsby-source-strava].

## Contributing

-   ⇄ Pull/Merge requests and ★ Stars are always welcome.
-   For bugs and feature requests, please [create an issue][github-issue].

## License

This project is licensed under the MIT License - see the [LICENCE](./LICENCE.md) file for details

[badge-npm]: https://img.shields.io/npm/v/gatsby-strava-tiles.svg?style=flat-square
[badge-npm-dl]: https://img.shields.io/npm/dt/gatsby-strava-tiles.svg?style=flat-square
[badge-licence]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[badge-prs-welcome]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[npm]: https://www.npmjs.org/package/gatsby-strava-tiles
[github-issue]: https://github.com/cedricdelpoux/gatsby-strava-tiles/issues/new
[gatsby-source-strava]: https://github.com/cedricdelpoux/gatsby-source-strava
