import app from './app'

const port = process.env.PORT || 3000

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
    console.log(`Health check: http://localhost:${port}/health`)
  })
}

export default app
