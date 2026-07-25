import { POST_INSTALL_FN_ID } from 'src/constants/universal-identifiers';
import { InstallPayload, definePostInstallLogicFunction } from 'twenty-sdk/define';

const handler = async (_payload: InstallPayload) => {
  return {
    installed: true,
    message:
      'RE Acquisition app installed. Run `yarn seed` to populate sample deals.',
  };
};

export default definePostInstallLogicFunction({
  universalIdentifier: POST_INSTALL_FN_ID,
  name: 'post-install',
  handler,
  shouldRunSynchronously: true,
});
