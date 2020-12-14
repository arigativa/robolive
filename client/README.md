# Robolive WEB client

_This project was bootstrapped with [Create React App][cra]._

## Available Scripts

In the project directory, you can run:

### `npm install`

Installs all of the apps' dependencies.

### `npm run start`

Builds and runs optimised app locally at [http://localhost:3000](http://localhost:3000).

### `npm run dev`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits

### `npm run test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

### `npm run lint`

Runs [ESLint][eslint] for every TypeScript and JavaScript file including TSX/JSX.<br />
Prompts lint warnings and errors to console.

### `npm run prettify`

Runs [Prettier][prettier] for everything.

### `npm run analyze`

Runs [source-map-explorer][sme] on `build` folder.<br />
It shows you a treemap visualization to help you debug where all the code is coming from.

### `npm run storybook`

Runs [Storybook][storybook] sandbox.<br />
Open [http://localhost:9009](http://localhost:9009) to view it in the browser.

The page will reload if you make edits

### `npm run storybook:build`

Builds the storybook sandbox for deploy to the `storybook-static` folder.

### [`npm run cy:open`](https://docs.cypress.io/guides/guides/command-line.html#cypress-open)

Opens the [Cypress][cypress] Test Runner.

### [`npm run cy:run`](https://docs.cypress.io/guides/guides/command-line.html#cypress-run)

Runs Cypress tests to completion.

## Tech Stack

- [TypeScript][ts]
- [Webpack](https://webpack.js.org/) configured via [Create React App][cra]
- Code linting with [ESLint][eslint] and [Prettier][prettier]
- Isolated React component development environment with [Storybook][storybook]
- Functional tests with [Cypress][cypress]
- Unit tests with [Jest][jest]
- Bundle analyser [source-map-explorer][sme] to keep the size
- Prepush/commit hooks with [husky][husky]
- Layout with [React][react]
- UI components library is [MaterialUI][material-ui]
- State management with [Redux][redux]
- Styles with [css-modules][css-modules]
