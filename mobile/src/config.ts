import { Platform } from 'react-native';

// URL base del backend MusicYA.
// En Android emulador, localhost del PC se accede como 10.0.2.2.
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = `http://${HOST}:4000/api`;
export const SOCKET_URL = `http://${HOST}:4000`;
