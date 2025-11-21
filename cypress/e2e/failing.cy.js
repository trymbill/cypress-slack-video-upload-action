describe('Failing Test', () => {
  it('should fail and generate screenshots/videos', () => {
    cy.visit('https://example.com')
    // This assertion will intentionally fail to generate screenshots and videos
    cy.contains('This text does not exist').should('be.visible')
  })
})
