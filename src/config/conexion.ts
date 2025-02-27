const sql = require('mssql');
const sqlConfig = {
  server:
    'aws-asociacionmujerescallosa.cz84eimw4uie.eu-north-1.rds.amazonaws.com',
  database: 'bd_asociacion_mujeres',
  user: 'root',
  password: 'asociacionMujeres_2022',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: false, // change to true for local dev / self-signed certs
  },
};

// async function connectToDatabase() {
//   try {
//     await sql.connect(config);
//     console.log('Connected to the database successfully!');
//     // Perform database operations here
//   } catch (error) {
//     console.error('Error connecting to the database:', error);
//   }
// }
export async function connectToDatabase() {
  try {
    // make sure that any items are correctly URL encoded in the connection string
    await sql.connect(sqlConfig);
    const result = await sql.query`select * from mytable where id = hola`;
    console.dir(result);
  } catch (err) {
    // ... error checks
  }
}
