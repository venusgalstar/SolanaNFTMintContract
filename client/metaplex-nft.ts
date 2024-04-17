import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  Metaplex,
  keypairIdentity,
  toMetaplexFile,
  toBigNumber,
  CreateCandyMachineInput,
  DefaultCandyGuardSettings,
  CandyMachineItem,
  toDateTime,
  sol,
  TransactionBuilder,
  CreateCandyMachineBuilderContext,
} from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import * as fs from "fs";
import { publicKey } from "@metaplex-foundation/umi";

const QUICKNODE_RPC = "https://api.devnet.solana.com"; // 👈 Replace with your QuickNode Solana Devnet HTTP Endpoint
const SESSION_HASH = "QNDEMO" + Math.ceil(Math.random() * 1e9); // Random unique identifier for your session
const SOLANA_CONNECTION = new Connection(QUICKNODE_RPC, {
  commitment: "finalized",
  httpHeaders: { "x-session-hash": SESSION_HASH },
});
const WALLET = Keypair.fromSecretKey(
  bs58.decode(
    "mjscSouFove7dByjWG8yadueXxAyVt1cqsT76gt359BJneZQg8AqitFxTimBkXzSuNv3m3uAj24MF83yRrnYegs"
  )
);
const COLLECTION_NFT_MINT = [
  "E1sRPdRpcxAcjQCRUKnkMV4jkZRVWeDLbT2TnDSyCyhz",
  "8M7mUHm9L7fPm6dBJFYjqGFWjoxEesawZij2TNuscA6i",
  "8DagZL9qYZwE5DgmRe5Eu6JAG3GA2CFkQArFkinR2ZSR",
];

const METADATA = [
  "https://scarlet-official-minnow-138.mypinata.cloud/ipfs/QmZkvuALEaZX5xK5vhW8osjL84J4Byv9RjecRg7JGfqTNQ",
  "https://scarlet-official-minnow-138.mypinata.cloud/ipfs/QmVKCc22rusxHNqVT91Nx8JBRaBGkQ81shR9oyVs5Sx5zp",
  "https://scarlet-official-minnow-138.mypinata.cloud/ipfs/QmWESN5aBV5EF1qB1U2JMxGrnn7nK3VNLniWkYTKEeXNSV",
]
const METAPLEX = Metaplex.make(SOLANA_CONNECTION).use(keypairIdentity(WALLET));
const CANDY_MACHINE_ID = "";
const CONFIG = {
  name: "NFT",
  symbol: "VT",
  sellerFeeBasisPoints: 500, //500 bp = 5%
  creators: [
    {
      address: new PublicKey("B45t7VFMD9tNbDG8Unzr9z6LbknjwNegD9qDtd7jiLVy"),
      share: 50,
    },
    {
      address: new PublicKey("4x6TeJ7aXDGVtN8Wmh1tCMa1sB3Q6fXRwUptBkYBHbd7"),
      share: 50,
    },
  ],
};

async function createCollectionNft() {
  const { nft: collectionNft } = await METAPLEX.nfts().create({
    name: "VTopia Collection",
    uri: METADATA[0],
    sellerFeeBasisPoints: 0,
    isCollection: true,
    updateAuthority: WALLET,
  });

  console.log(
    `✅ - Minted Collection NFT: ${collectionNft.address.toString()}`
  );
  console.log(
    `     https://explorer.solana.com/address/${collectionNft.address.toString()}?cluster=devnet`
  );
}

async function mintNft(
  metadataUri: string,
  name: string,
  sellerFee: number,
  symbol: string,
  collection: string,
  creators: { address: PublicKey; share: number }[]
): Promise<PublicKey> {
  console.log(`Step 3 - Minting NFT`);
  const { nft } = await METAPLEX.nfts().create({
    uri: metadataUri,
    name: name,
    sellerFeeBasisPoints: sellerFee,
    symbol: symbol,
    creators: creators,
    collection: new PublicKey(collection),
    isMutable: false,
  });
  console.log(`   Success!🎉`);
  console.log(
    `   Minted NFT: https://explorer.solana.com/address/${nft.address}?cluster=devnet`
  );
  return nft.address;
}

async function mintProgrammableNft(
  metadataUri: string,
  name: string,
  sellerFee: number,
  symbol: string,
  collection: string,
  creators: { address: PublicKey; share: number }[]
) {
  console.log(`Minting pNFT`);
  try {
    const transactionBuilder = await METAPLEX.nfts().builders().create({
      uri: metadataUri,
      name: name,
      sellerFeeBasisPoints: sellerFee,
      symbol: symbol,
      creators: creators,
      isMutable: true,
      isCollection: false,
      // collection: new PublicKey(collection),
      tokenStandard: TokenStandard.ProgrammableNonFungible,
      ruleSet: null,
    });

    let { signature, confirmResponse } =
      await METAPLEX.rpc().sendAndConfirmTransaction(transactionBuilder);
    if (confirmResponse.value.err) {
      throw new Error("failed to confirm transaction");
    }
    const { mintAddress } = transactionBuilder.getContext();
    console.log(`   Success!🎉`);
    console.log(
      `   Minted NFT: https://explorer.solana.com/address/${mintAddress.toString()}?cluster=devnet`
    );
    console.log(
      `   Tx: https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
    return mintAddress.toString();
  } catch (err) {
    console.log(err);
  }
}

async function generateCandyMachine() {
  const candyMachineSettings: CreateCandyMachineInput<DefaultCandyGuardSettings> =
    {
      itemsAvailable: toBigNumber(3), // Collection Size: 3
      sellerFeeBasisPoints: 1000, // 10% Royalties on Collection
      symbol: "DEMO",
      maxEditionSupply: toBigNumber(0), // 0 reproductions of each NFT allowed
      isMutable: true,
      creators: [{ address: WALLET.publicKey, share: 100 }],
      collection: {
        address: new PublicKey(COLLECTION_NFT_MINT), // Can replace with your own NFT or upload a new one
        updateAuthority: WALLET,
      },
    };
  const { candyMachine } = await METAPLEX.candyMachines().create(
    candyMachineSettings
  );
  console.log(`✅ - Created Candy Machine: ${candyMachine.address.toString()}`);
  console.log(
    `     https://explorer.solana.com/address/${candyMachine.address.toString()}?cluster=devnet`
  );
}

async function transferNFT(mintAddress, dest, programmable = true) {
  // 👇 Add this code
  const destination = new PublicKey(dest); // replace with your friend's public key
  const transferTransactionBuilder = await METAPLEX.nfts()
    .builders()
    .transfer({
      nftOrSft: {
        address: mintAddress,
        tokenStandard: programmable
          ? TokenStandard.ProgrammableNonFungible
          : TokenStandard.NonFungible,
      },
      authority: WALLET,
      fromOwner: WALLET.publicKey,
      toOwner: destination,
    });
  // Name new variables since we already have a signature and confirmResponse
  let { signature: sig2, confirmResponse: res2 } =
    await METAPLEX.rpc().sendAndConfirmTransaction(transferTransactionBuilder, {
      commitment: "finalized",
    });
  if (res2.value.err) {
    throw new Error("failed to confirm transfer transaction");
  }
  console.log(`   Tx: https://explorer.solana.com/tx/${sig2}?cluster=devnet`);
}

async function main() {
  // createCollectionNft();

  const addres = [
    "CjGiahcBVbB7oQqBWK8xMP1XKPfKR33S17mSuovCSfyi",
    // "awFvi2DJuewSKQeEoSP8poxoM5inytsXd5bDWrmLa4H",
    // "4x6TeJ7aXDGVtN8Wmh1tCMa1sB3Q6fXRwUptBkYBHbd7",
    // "sCMYUv42jRq5WNkYygng2SjCpsHCyoQrtp1Fr7KFeqV",
    // "7weaTPysBSfi4hnjQC7Po78QMrwfaNVy7VyAMa5t7rqt",
    // "J3P7X3LmpoM31gb68UoxQTscqzyuicgFAKeMh2NchPk9",
    // "FTgy1WK7zyrSMfjC8e81aGrStMs2J1yHFjCfLwc7j8BV",
    // "DjwMoX4hs6tNgScT1zSy52ApxGbn8UCY3kpFcqkh23XA",
    // "Fub88mQDDD46s4aX9GjhSz2thyhbxeV8arCtSK8urvjy",
  ];

  const PROGRAM_NFT = false;
  let idx = 0;
  for (let k = 0; k < COLLECTION_NFT_MINT.length; k++) {
    // for (let i = 0; i < addres.length; i++) {
      // for (let j = 0; j < 100; j++) {
        idx = idx + 1;
        if (PROGRAM_NFT) {
          let mint = await mintProgrammableNft(
            METADATA[k],
            CONFIG.name + idx,
            CONFIG.sellerFeeBasisPoints,
            CONFIG.symbol,
            COLLECTION_NFT_MINT[k],
            CONFIG.creators
          );

          await transferNFT(new PublicKey(mint), new PublicKey(addres[0]));
        } else {
          let nft = await mintNft(
            METADATA[k],
            CONFIG.name + idx,
            CONFIG.sellerFeeBasisPoints,
            CONFIG.symbol,
            COLLECTION_NFT_MINT[k],
            CONFIG.creators
          );

          await transferNFT(nft, new PublicKey(addres[0]), false);
        }
      // }
    // }
  }
}

async function getTxStatus() {
  const connection = SOLANA_CONNECTION;

  // Define a tx id
  const txId =
    "5y1giFSuYgwShRq6yi4KSWDya1PEvMoPSiUGymtkeXvnRoD8SCEQ9MjsQu1U2pLkba2y6w4gHthSRQ943jzW2imy";

  // Get the transaction status
  const result = await connection.getParsedTransaction(txId);

  console.log(result);
}

// createCollectionNft();
main();
