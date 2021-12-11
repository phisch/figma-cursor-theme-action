const core = require('@actions/core');

try {
  const FIGMA_ACCESS_TOKEN = core.getInput('figma_access_token');
  const FIGMA_FILE_KEY = core.getInput('figma_file_key');

  if (!FIGMA_ACCESS_TOKEN) {
    throw Error('Provoide your Figma access token in the FIGMA_ACCESS_TOKEN environment variable!');
  }

  if (!FIGMA_FILE_KEY) {
    throw Error('Provide your Figma file key in the FIGMA_FILE_KEY environment variable!');
  }

  console.log('File key is: ' + FIGMA_FILE_KEY);

} catch (error) {
  core.setFailed(error.message);
}