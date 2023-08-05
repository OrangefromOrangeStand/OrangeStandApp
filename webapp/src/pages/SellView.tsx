import Head from 'next/head'
import { Heading, Box } from "@chakra-ui/layout"
import { SimpleGrid } from '@chakra-ui/react'
import { useState, useEffect} from 'react'
import { ethers } from "ethers"
import { ERC20ABI as erc20abi} from 'abi/ERC20ABI'
import deployedContracts from '../../public/deployed_contracts.json';
import enabledErc721Contracts from '../../public/erc721tokens.json';
import enabledErc20Contracts from '../../public/erc20tokens.json';
import { ERC721ABI as erc721Abi} from 'abi/ERC721ABI'
import React from 'react';
import AuctionableErc721Item from 'components/AuctionableErc721Item'
import AuctionableErc20Item from 'components/AuctionableErc20Item'
import { AuctionCoordinator as auctionCoordinatorAbi} from 'abi/AuctionCoordinator'
import { useToast } from '@chakra-ui/react'
import { Contract } from 'ethers'

declare let window:any

interface Props {
  activeAccount: string | undefined;
  numSettledTransactions: number;
  numSellingItems: number;
  setNumSellingItems: React.Dispatch<React.SetStateAction<number>>;
  provider: ethers.providers.Web3Provider | undefined;
}

export default function SellView(props:Props) {
  const [erc721RenderingList, _setErc721RenderingList] = useState<any[]>([]);
  const [erc20RenderingList, _setErc20RenderingList] = useState<any[]>([]);
  let auctionCoordinatorContract = deployedContracts["auctionCoordinator"];
  let orangeStandTicketAddress = deployedContracts["orangeStandTicketAddress"];
  let startingBlockNumber = 0;
  const [auctionCoordinator, setAuctionCoordinator] = useState<Contract|null>(null);

  // Required for events to access the latest TypeScript state
  const erc721RenderingListRef = React.useRef(erc721RenderingList);
  const erc20RenderingListRef = React.useRef(erc20RenderingList);

  const setErc721RenderingList: React.Dispatch<any[]> = data => {
    erc721RenderingListRef.current = data;
    _setErc721RenderingList(data);
  };
  const setErc20RenderingList: React.Dispatch<any[]> = data => {
    erc20RenderingListRef.current = data;
    _setErc20RenderingList(data);
  };

  const toast = useToast()

  useEffect(() => {
    if(props.activeAccount == undefined){
      setErc721RenderingList([]);
      setErc20RenderingList([]);
      return
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    if(auctionCoordinator == null){
      setAuctionCoordinator(new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider.getSigner()));
    }
  },[auctionCoordinatorContract,auctionCoordinator])

  useEffect(() => {
    if(!window.ethereum || props.activeAccount == undefined) {
      setErc721RenderingList([]);
      setErc20RenderingList([]);
      return
    }
    const populateAuctions = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      
      var erc721List: any[] = [];
      for (let erc721Token in enabledErc721Contracts) {
        let tokenContract = enabledErc721Contracts[erc721Token];
        var currentErc721List: any[] = [];
        const erc721 = new ethers.Contract(tokenContract, erc721Abi, provider)
        if(props.activeAccount != undefined){
          currentErc721List = await getErc721List(erc721, props.activeAccount, erc721List.length);
        }
        erc721List = erc721List.concat(currentErc721List);
      }
      setErc721RenderingList(erc721List);

      var erc20List: any[] = [];
      for (let erc20Token in enabledErc20Contracts){
        let erc20Contract = enabledErc20Contracts[erc20Token];
        const erc20 = new ethers.Contract(erc20Contract, erc20abi, provider)
        var currentErc20List: any[] = [];
        if(props.activeAccount != undefined){
          currentErc20List = await getErc20List(erc20, props.activeAccount);
        }
        erc20List = erc20List.concat(currentErc20List);
      }
      setErc20RenderingList(erc20List);
      if(auctionCoordinator != null){
        auctionCoordinator.removeAllListeners("Erc20AuctionCreation");
        auctionCoordinator.removeAllListeners("Erc721AuctionCreation");
      }

      provider.once("block", (blockNumber) => {
        startingBlockNumber = blockNumber;
        if(auctionCoordinator == null){
          let newAuctionCoordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider.getSigner());
          newAuctionCoordinator.on("Erc20AuctionCreation", erc20AuctionCreationListener);
          newAuctionCoordinator.on("Erc721AuctionCreation", erc721AuctionCreationListener);
          setAuctionCoordinator(newAuctionCoordinator);
        } else {
          auctionCoordinator.on("Erc20AuctionCreation", erc20AuctionCreationListener);
          auctionCoordinator.on("Erc721AuctionCreation", erc721AuctionCreationListener);
        }
      })
    }
    populateAuctions();
  },[props.activeAccount,props.numSellingItems,props.numSettledTransactions])

  const erc721AuctionCreationListener = (auctionId: number,item:string,originalOwner: string,tokenId: number,blockNumber: number) => {
    if(startingBlockNumber < blockNumber && erc721RenderingListRef.current.find((elem) => {return elem.tokenId == tokenId})){
      setErc721RenderingList(erc721RenderingListRef.current.filter(obj => obj.tokenId != tokenId));

      addAuctionItemToEnd({id: +auctionId, num: +auctionId});
      toast({
        title: "You've created a new auction",
        //description: "New auction has been created " + auctionId + " and " + tokenId,
        status: 'success',
        duration: 5000,
        variant: 'subtle',
        isClosable: true,
        /*containerStyle: {
          backgroundColor: 'red'
        },*/
      })
    }
  }

  const addAuctionItemToEnd = (newAuctionItem: any) => {
    props.setNumSellingItems(props.numSellingItems+1);
  }

  const erc20AuctionCreationListener = (auctionId: number,item: string,originalOwner: string,amount: number,blockNumber: number) => {
    if(startingBlockNumber < blockNumber){
      let deductedTokens = amount;
      let newList = erc20RenderingListRef.current;
      for(var i = 0 ;i < erc20RenderingListRef.current.length; i++){
        let foundItem = erc20RenderingListRef.current[i];
        let foundBalance = foundItem.bal;
        let foundDecPlaces = foundItem.dec;
        let formattedTokens = foundBalance / (10 ** foundDecPlaces);
        deductedTokens = amount / (10 ** foundDecPlaces);
        newList[i].bal = foundBalance - amount;
        newList[i].formattedBalance = formattedTokens - deductedTokens;
      }
      setErc20RenderingList(newList);
      addAuctionItemToEnd({id: +auctionId, num: +auctionId});
      toast({
        title: "You've created a new auction",
        //description: "New auction has been created " + auctionId + " for " + deductedTokens + " SIM",
        status: 'success',
        duration: 5000,
        variant: 'subtle',
        isClosable: true,
        /*containerStyle: {
          background: 'red',
          backgroundColor: '#fef1df'
        },*/
      })
    }
  }

  async function getErc721List(erc721: ethers.Contract, account: string, startingIndex: number){
    var returnVal = [];
    let balance = await erc721.balanceOf(account);
    for(var i = 0; i < balance; i++){
      let tokenId = await erc721.tokenOfOwnerByIndex(account, i);
      let index = i + startingIndex;
      returnVal.push({tokenId: +tokenId, address: erc721.address, index: index});
    }
    return returnVal;
  }

  async function getErc20List(erc20: ethers.Contract, account: string){
    var returnVal = [];
    let balance = await erc20.balanceOf(account);
    let symbol = await erc20.symbol();
    let decPlaces = await erc20.decimals();
    let formattedBalance = (balance / (10 ** decPlaces));
    returnVal = [{bal: +balance, sym: symbol, dec: +decPlaces, formattedBalance: +formattedBalance, address: erc20.address}];
    return returnVal;
  }
  return (
    <>
      <Head>
        <title>My DAPP</title>
      </Head>
      <SimpleGrid columns={2} spacing='24px'>
        {erc721RenderingList.map((product, i) => (
            <AuctionableErc721Item key={product.index} addressContract={product.address} 
              iteration={product.tokenId} 
              auctionCoordinatorContract={auctionCoordinatorContract}
              orangeStandTicketAddress={orangeStandTicketAddress}
              />
            ))}
        {erc20RenderingList.map((product, k) => (
            <AuctionableErc20Item 
              key={product.sym} addressContract={product.address}
              iteration={k} connectedAccount={props.activeAccount}
              balance={product.bal}
              formattedBalance={product.formattedBalance}
              auctionCoordinatorContract={auctionCoordinatorContract}
              orangeStandTicketAddress={orangeStandTicketAddress}
              provider={props.provider}
              />
            ))}
      </SimpleGrid>
    </>
  )
}
