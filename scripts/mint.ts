import { mintToken } from '../utils/mintToken';

async function main() {
  await mintToken();
}

main()
  .then(() => {
    console.log('Minted 😀!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
