import bcryptjs from 'bcryptjs';

const password = 'test123456';
const hash = bcryptjs.hashSync(password, 10);
console.log(hash);
