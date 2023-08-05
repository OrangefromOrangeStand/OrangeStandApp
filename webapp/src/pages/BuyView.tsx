import Head from 'next/head'
import { Heading } from "@chakra-ui/layout"
import { SimpleGrid } from '@chakra-ui/react'
import deployedContracts from '../../public/deployed_contracts.json';
import { AuctionCoordinator as auctionCoordinatorAbi} from 'abi/AuctionCoordinator'
import React from 'react';
import { useState, useEffect } from 'react'
import { ethers } from "ethers"

import ActiveAuctionItem from 'components/ActiveAuctionItem'

declare let window:any
interface Props {
  activeAccount: string | undefined;
  numSettledTransactions: number;
  setNumSettledTransactions: React.Dispatch<number>;
  numSellingItems: number;
  numBidsMade: React.MutableRefObject<number>;
  setNumBidsMade: React.Dispatch<number>;
}

export default function BuyView(props:Props) {

  const [activeAuctionRenderingList, _setActiveAuctionRenderingList] = useState<any[]>([]);
  const activeAuctionRenderingListRef = React.useRef(activeAuctionRenderingList);
  const setActiveAuctionRenderingList: React.Dispatch<any[]> = (data: any[]) => {
    activeAuctionRenderingListRef.current = data;
    _setActiveAuctionRenderingList(data);
  };
  let auctionCoordinatorContract = deployedContracts["auctionCoordinator"];
  let paymentContract = deployedContracts["orangeStandTicketAddress"];

  const [state, setState] = React.useState({ num: 0 });
  const counter = React.useRef(0);
  
  useEffect(() => {
    counter.current += 1;
    const timer = setTimeout(() => setState({ num: state.num + 1 }), 10000);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if(!window.ethereum) return
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const auctionCoordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider);
    const populateAuctionIds = async () => {
      let auctionIds = await auctionCoordinator.getAllActiveAuctions();
      setActiveAuctionRenderingList(auctionIds.map((x: number) => ({num: +(x)})));
    }
    populateAuctionIds();
  },[props.activeAccount,props.numSellingItems,props.numSettledTransactions,auctionCoordinatorContract,state])
  return (
    <>
      <Head>
        <title>My DAPP</title>
      </Head>
      <SimpleGrid columns={2} spacing='24px'>
        {activeAuctionRenderingListRef.current.map((product, i) => (
              <ActiveAuctionItem key={product.num}
                currentAccount={props.activeAccount} 
                auctionId={product.num} 
                auctionCoordinatorContract={auctionCoordinatorContract}
                paymentContract={paymentContract}
                activeAuctionRenderingList={activeAuctionRenderingListRef}
                setActiveAuctionRenderingList={setActiveAuctionRenderingList}
                numSettledTransactions={props.numSettledTransactions}
                setNumSettledTransactions={props.setNumSettledTransactions}
                numBidsMade={props.numBidsMade}
                setNumBidsMade={props.setNumBidsMade}/>
            ))}
      </SimpleGrid>
    </>
  )
}
