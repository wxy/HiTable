import {Config} from '@remotion/cli/config';
Config.setBrowserExecutable(process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
Config.setConcurrency(2);
Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);
