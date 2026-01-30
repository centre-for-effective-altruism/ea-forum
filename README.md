# EA Forum

### [Effective Altruism Forum](https://forum.effectivealtruism.org)

NOTE: This repository is still in beta.

## Running

First install dependencies with `npm install`. You'll then need to setup a
`.env` file (see `ProcessEnv.d.ts` for a complete list), then you can run the
forum with `npm run dev`. CEA devs can find a development `.env` file in
1password.

## Coding conventions

 - Where possible fetch data from within
   [server components](https://react.dev/reference/rsc/server-components),
   when not possible use a
   [server function](https://react.dev/reference/rsc/server-functions)
 - Server functions should be wrapped with `actionClient`
 - Combine multiple class names using [clsx](https://www.npmjs.com/package/clsx)
 - Where possible prefer Drizzle's
   [relational API](https://orm.drizzle.team/docs/rqb-v2) for querying

## Reporting security vulnerabilities

Please report security vulnerabilities to
[forum@effectivealtruism.org](mailto:forum@effectivealtruism.org).

## License

The forum is free software under the GNU Affero GPL v3. See the included
`LICENSE.txt` file for details. Several libraries are also included as source
in `src/vendor` and these have their own licenses.
