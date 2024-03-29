# Production deployment procedure

1. Publish [a pre-release](https://github.com/arigativa/robolive/releases/new)
    
   Select `This is a pre-release` checkbox:
   ![](./docs/publish-prerelease.png)
   
   You will get a release with just two assets:
   ![](./docs/prereleased-published.png)
    
2. Wait [jobs](https://github.com/arigativa/robolive/actions) to build all the artifacts
    
   ![](./docs/workflow-to-wait.png)
   
   Check these for being present on release page:
   * `engine.tar.gz`
   * `registry.zip`
   * `webclient.tar.gz`
   ![](./docs/release-complete.png)

3. Release

   Uncheck `This is a pre-release` and save
   ![](./docs/update-to-release.png)
   
4. ...
5. Production is deployed


Deployment is performed by Github Actions described
in [.github/workflows/production.yml](.github/workflows/production.yml)


