declare namespace Cypress {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Chainable {
    /**
     * Custom command to get element by data-cy attribute
     *
     * @example
     *    cy.getcy('submit').click()
     */
    getcy(cyid: string): Chainable<Element>
  }
}
