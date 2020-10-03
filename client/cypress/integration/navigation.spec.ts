describe('Day forecast navigation', () => {
  beforeEach(() => {
    cy.viewport('macbook-15')
    cy.server({
      force404: true
    })

    cy.route({
      url: '**/forecast**',
      response: 'fixture:success_imperial',
      status: 200
    }).as('getForecast')

    cy.visit('/')
    cy.wait('@getForecast')

    cy.getcy('day-card__root').as('dayCards')
    cy.getcy('forecast__navigation_prev').as('navigationPrev')
    cy.getcy('forecast__navigation_next').as('navigationNext')
  })

  it('only three cards is visible in very beginning', () => {
    cy.get('@dayCards').eq(2).should('be.visible')
    cy.get('@dayCards').eq(3).should('not.be.visible')
  })

  it('navigation prev is hidden when there is no day-card on the left', () => {
    cy.get('@navigationPrev').should('not.be.visible')
    cy.get('@navigationNext').should('be.visible')
  })

  it('day cards are moving right and prev appears when next clicks', () => {
    cy.get('@navigationNext').click()

    cy.get('@navigationPrev').should('be.visible')
    cy.get('@dayCards').eq(0).should('not.be.visible')
    cy.get('@dayCards').eq(3).should('be.visible')
    cy.get('@dayCards').eq(4).should('not.be.visible')
  })

  context('scroll to the most right', () => {
    beforeEach(() => {
      cy.get('@navigationNext').click().click().click().should('not.be.visible')
      cy.get('@navigationPrev').should('be.visible')
    })

    it('navigation next is hidden when there is no day-card on the right', () => {
      cy.get('@dayCards').eq(2).should('not.be.visible')
      cy.get('@dayCards').eq(5).should('be.visible')
    })

    it('navigation prev scrolls left', () => {
      cy.get('@navigationPrev').click().should('be.visible')
      cy.get('@navigationNext').should('be.visible')
      cy.get('@dayCards').eq(1).should('not.be.visible')
      cy.get('@dayCards').eq(2).should('be.visible')
      cy.get('@dayCards').eq(4).should('be.visible')
      cy.get('@dayCards').eq(5).should('not.be.visible')
    })
  })
})
