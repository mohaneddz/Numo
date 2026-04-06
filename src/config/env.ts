const devModeEnv = import.meta.env.VITE_DEV_MODE;

// Keep enabled by default for now. Can be flipped later via VITE_DEV_MODE=false.
export const DEV_MODE = devModeEnv ? devModeEnv.trim().toLowerCase() === 'true' : true;
export const DEBUG = false;
