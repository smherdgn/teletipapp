
/**
 * @format
 */
import 'react-native-get-random-values'; // For uuid
import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
