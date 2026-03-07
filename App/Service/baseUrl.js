const ENV = 'prod';
const baseUrlLocal = 'https://api.redfynix.com/';
const baseUrlProd = 'https://api.deshoali-srhr.com/';

const baseUrl = ENV === 'prod' ? baseUrlProd : baseUrlLocal;

export default baseUrl;
