describe('Passing Test', () => {
  it('should pass successfully', () => {
    cy.visit('https://example.com')
    cy.contains('Example Domain').should('be.visible')
  })
})
