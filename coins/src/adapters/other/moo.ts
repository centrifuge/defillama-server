
// import { fetchPrice } from '../utils/fetchPrice'; // Assuming you have a function to fetch price
import { addToDBWritesList, getTokenAndRedirectData } from '../utils/database'; // Assuming you have a function to add data to the database
import { Write } from "../utils/dbInterfaces";
import { call } from "@defillama/sdk/build/abi/index";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";

// Moo BVM BVM-ETH"
const targets = ['0x53713F956A4DA3F08B55A390B20657eDF9E0897B', '0xa3A4a4bf50B7b0d766b99C8d4B0F0E7fD02658a6'];

const chain = 'base';

export default async function getTokenPrice(timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];
  await contractCalls(targets, block, writes, timestamp);
  return writes;
}

async function contractCalls(
  targets: string[],
  block: number | undefined,
  writes: Write[],
  timestamp: number,
) {
  const contractAbi = [
    {
      constant: true,
      inputs: [],
      name: 'reserve0',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'reserve1',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'totalSupply',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  ];
  const contractAbiBeefy = [
    {
      constant: true,
      inputs: [],
      name: 'getPricePerFullShare',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  ];

  const [reserve0, reserve1, totalSupply, multiplier, tokenInfos] = await Promise.all([
    call({
      target: targets[0],
      chain,
      abi: contractAbi[0],
      block,
    }),
    call({
      target: targets[0],
      chain,
      abi: contractAbi[2],
      block,
    }),
    call({
      target: targets[0],
      chain,
      abi: contractAbi[2],
      block,
    }),
    call({
      targets: targets[1],
      chain,
      abi: contractAbiBeefy[0],
      block,
    }),
    getTokenInfo(chain, [targets[1]], block),
  ]);

  const [{ price: priceEth }] = await getTokenAndRedirectData(['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'], 'ethereum', timestamp);
  const [{ price: priceBvm }] = await getTokenAndRedirectData(['0xd386a121991e51eab5e3433bf5b1cf4c8884b47a'], 'base', timestamp);

  let price = (reserve0 * priceEth + reserve1 * priceBvm) / totalSupply;
  price *= multiplier / 1e18; // mutiplier deicmals removed
  price = priceEth / price;



  addToDBWritesList(
    writes,
    chain,
    targets[1],
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    "Moo BVM BVM-ETH",
    1,
  );
}


