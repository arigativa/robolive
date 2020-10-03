describe('App initialisation', () => {
  beforeEach(() => {
    cy.viewport('macbook-15')
    cy.server({
      force404: true
    })
  })

  it('shows loading skeleton while loading initial data', () => {
    cy.route({
      url: '**/forecast**',
      response: 'fixture:success_imperial',
      status: 200,
      delay: 100
    }).as('getForecast')

    cy.visit('/')
    cy.getcy('forecast__skeleton').should('be.visible')

    cy.wait('@getForecast')
    cy.getcy('forecast__skeleton').should('not.exist')
    cy.getcy('forecast__root').should('be.visible')
  })

  it('shows error screen when request failed', () => {
    cy.route({
      url: '**/forecast**',
      response: 'fixture:success_imperial',
      status: 500,
      delay: 100
    }).as('getForecast')

    cy.visit('/')
    cy.wait('@getForecast')
    cy.getcy('forecast-error-report__root')
      .contains('You are facing an unexpected Server side Error 500!')
      .should('be.visible')
  })

  it('can retry when fails by timeout', () => {
    cy.route({
      url: '**/forecast**',
      response: 'fixture:success_imperial',
      status: 200,
      delay: 500
    }).as('getForecastSlow')

    cy.visit('/')
    cy.wait('@getForecastSlow')

    cy.route({
      url: '**/forecast**',
      response: 'fixture:success_imperial',
      status: 200,
      delay: 100
    }).as('getForecastFast')

    cy.getcy('forecast__retry').should('be.visible').click()

    cy.getcy('forecast__skeleton').should('be.visible')

    cy.wait('@getForecastFast')
    cy.getcy('forecast__root').should('be.visible')
  })
})
