# EA Forum

### [Effective Altruism Forum](https://forum.effectivealtruism.org)

## Running

First install dependencies with `npm install`. You'll then need to setup a
`.env` file (see environment variables below), then you can run the forum with
`npm run dev`.

## Environment variables

The forum reads environment variables from a `.env` file. For a full list of
expected environment variables see `ProcessEnv.d.ts`. CEA devs can find a
development `.env` file in 1password.

## License

The forum is free software under the GNU Affero GPL v3. See the included
`LICENSE.txt` file for details. Several libraries are also included as source
in `src/vendor` as these have their own licenses.
