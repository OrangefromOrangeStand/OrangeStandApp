import { Flex, Button, Spacer } from '@chakra-ui/react'
import { Image } from '@chakra-ui/react'
import { useState } from 'react'
import { ethers } from "ethers"
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import BuyView from '../pages/BuyView'
import SellView from '../pages/SellView'
import TicketsView from '../pages/TicketsView'
import { SimpleGrid, Box } from '@chakra-ui/react'
import React from 'react';

declare let window:any

export default function Header() {

  const [activeAccount, setActiveAccount] = useState<string | undefined>()
  const [activeAuctionRenderingList, _setActiveAuctionRenderingList] = useState<any[]>([]);
  const [numBidsMade, _setNumBidsMade] = useState<number>(0);
  const [numSettledTransactions, setNumSettledTransactions] = useState<number>(0);
  const [numSellingItems, setNumSellingItems] = useState<number>(0);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider|undefined>(undefined);

  const numBidsMadeRef = React.useRef(numBidsMade);
  const setNumBidsMade = (data: number) => {
    numBidsMadeRef.current = data;
    _setNumBidsMade(data);
  };

  const activeAuctionRenderingListRef = React.useRef(activeAuctionRenderingList);
  const setActiveAuctionRenderingList = (data: any[]) => {
    activeAuctionRenderingListRef.current = data;
    _setActiveAuctionRenderingList(data);
  };

  const onClickConnect = () => {
    //client side code
    if(!window.ethereum) {
      console.log("please install MetaMask")
      return
    }
    
    //change from window.ethereum.enable() which is deprecated
    //see docs: https://docs.metamask.io/guide/ethereum-provider.html#legacy-methods
    window.ethereum.request({ method: 'eth_requestAccounts' })
    .then((accounts:any)=>{
      if(accounts.length>0) {
        setActiveAccount(accounts[0])
      }
    })
    .catch('error',console.error)

    //we can do it using ethers.js
    const providerVal = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(providerVal)
    
    // MetaMask requires requesting permission to connect users accounts
    providerVal.send("eth_requestAccounts", [])
    .then((accounts)=>{
      if(accounts.length>0) {
        globalThis.connectedAddress = accounts[0];
        setActiveAccount(accounts[0]);
      }
    })
    .catch((e)=>console.log(e))
  }

  const onClickDisconnect = () => {
    setActiveAccount(undefined)
    setActiveAuctionRenderingList([]);
  }

  return (
    <SimpleGrid columns={1} style={{
      backgroundColor: '#fef1df',
    }}>
      <Image src='header.jpg'/>
        <Tabs colorScheme='#a3c139;'>
          <Flex padding={2}>
          <TabList>
              <Tab>Explore</Tab>
              <Tab>Auction</Tab>
              <Tab>Tickets</Tab>
          </TabList>
          <Spacer/>
          <Box>
            {activeAccount  
                ? <Button onClick={onClickDisconnect} style={{
                  backgroundColor: '#a3c139'
                }}>
                        {activeAccount.substring(0,5) + "..." + activeAccount.substring(activeAccount.length-4)}
                    </Button>
                : <Button onClick={onClickConnect} style={{
                  backgroundColor: '#a3c139'
                }}>
                        Connect MetaMask
                    </Button>
                }
            </Box>
          </Flex>
          <TabPanels>
            <TabPanel>
                <BuyView activeAccount={activeAccount} 
                    numSettledTransactions={numSettledTransactions}
                    setNumSettledTransactions={setNumSettledTransactions}
                    numSellingItems={numSellingItems}
                    numBidsMade={numBidsMadeRef}
                    setNumBidsMade={setNumBidsMade}/>
            </TabPanel>
            <TabPanel>
                <SellView activeAccount={activeAccount}
                    numSettledTransactions={numSettledTransactions}
                    numSellingItems={numSellingItems}
                    setNumSellingItems={setNumSellingItems}
                    provider={provider}/>
            </TabPanel>
            <TabPanel>
                <TicketsView activeAccount={activeAccount}
                    numSettledTransactions={numSettledTransactions}
                    numSellingItems={numSellingItems}
                    setNumSellingItems={setNumSellingItems}
                    provider={provider}
                    numBidsMade={numBidsMadeRef.current}/>
            </TabPanel>
          </TabPanels>
        </Tabs>
    </SimpleGrid>
  )
}