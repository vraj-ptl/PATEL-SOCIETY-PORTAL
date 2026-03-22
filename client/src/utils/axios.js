import axios from 'axios';

// Send cookies with every request (required for sessions on Vercel)
axios.defaults.withCredentials = true;

export default axios;
