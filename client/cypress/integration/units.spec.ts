describe('Temperature units', () => {
  beforeEach(() => {
    cy.viewport('macbook-15')
    cy.server({
      force404: true
    })

    cy.route({
      url: '**/forecast**units=imperial',
      response: 'fixture:success_imperial',
      status: 200
    }).as('getForecastImperial')

    cy.route({
      url: '**/forecast**units=metric',
      response: 'fixture:success_metric',
      status: 200
    }).as('getForecastMetric')
  })

  it('imperial selected by default', () => {
    cy.visit('/')
    cy.wait('@getForecastImperial')

    cy.getcy('forecast__radio_metric').should('be.visible')
    cy.getcy('forecast__radio_imperial')
      .should('be.visible')
      .get('input')
      .should('be.checked')

    cy.getcy('day-card__root')
      .filter(':contains(°F)')
      .should('have.length', 6)
      .filter(':contains(°C)')
      .should('have.length', 0)
  })

  it('selects metric', () => {
    cy.visit('/')
    cy.wait('@getForecastImperial')

    cy.getcy('forecast__radio_metric').click().get('input').should('be.checked')
    cy.wait('@getForecastMetric')

    cy.getcy('day-card__root')
      .filter(':contains(°C)')
      .should('have.length', 6)
      .filter(':contains(°F)')
      .should('have.length', 0)
  })
})
