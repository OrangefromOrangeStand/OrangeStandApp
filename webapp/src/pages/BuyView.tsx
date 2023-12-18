import Head from 'next/head'
import deployedContracts from '../../public/deployed_contracts.json';
import { AuctionCoordinator as auctionCoordinatorAbi} from '../abi/AuctionCoordinator'
import ActiveAuctionItem from '../components/ActiveAuctionItem'
import { ethers } from "ethers"
import React from 'react';
import { useState, useEffect } from 'react'
import { MdCheckCircle } from "react-icons/md";
import { Heading } from "@chakra-ui/layout"
import { useClickable } from "@chakra-ui/clickable"
import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, List, ListItem, Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  ListIcon,
  Button,
  Center, SimpleGrid  } from '@chakra-ui/react';
import {
  AutoComplete,
  AutoCompleteInput,
  AutoCompleteItem,
  AutoCompleteCreatable,
  AutoCompleteList,
} from "@choc-ui/chakra-autocomplete";

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
  let auctionCoordinatorContract = deployedContracts["auctionCoordinator"];
  let paymentContract = deployedContracts["orangeStandTicketAddress"];
  // As we have used custom buttons, we need a reference variable to
  // change the state
  const [areTrendingCollectionsHidden, setAreTrendingCollectionsHidden] = React.useState<Boolean>(false);
  const [displayCollections, setDisplayCollections] = React.useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = React.useState<string>("");
  const [trendingCollections, setTrendingCollections] = React.useState<string[]>([]);
  const [activeAuctionRenderingList, _setActiveAuctionRenderingList] = useState<any[]>([]);
  const activeAuctionRenderingListRef = React.useRef(activeAuctionRenderingList);
  const setActiveAuctionRenderingList: React.Dispatch<any[]> = (data: any[]) => {
    activeAuctionRenderingListRef.current = data;
    _setActiveAuctionRenderingList(data);
  };
  const handleAutocompleteSearchTermChange = function (event) {
    displaySelectedCollection(event.item.value);
  }
  const [state, setState] = React.useState({ num: 0 });
  const counter = React.useRef(0);
  useEffect(() => {
    counter.current += 1;
    const timer = setTimeout(() => setState({ num: state.num + 1 }), 5000);
    return () => clearTimeout(timer);
  }, [state]);

  function displaySelectedCollection(searchValue){
    setSelectedCollection(searchValue);
    populateAuctionIds(searchValue);
    setAreTrendingCollectionsHidden(true);
  }

  function loadMainScreen(){
    setSelectedCollection("");
    setAreTrendingCollectionsHidden(false);
    setActiveAuctionRenderingList([]);
  }

  async function populateAuctionIds(searchValue) {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const auctionCoordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider);
    let auctionIds = await auctionCoordinator.getAllActiveAuctions(searchValue);
    setActiveAuctionRenderingList(auctionIds.map((x: number) => ({num: Number(x)})));
  }

  const Clickable = (props) => {
    const clickable = useClickable(props)
    return <Button display="inline-flex" {...clickable} />
  }

  useEffect(() => {
    if(!window.ethereum) return
    const provider = new ethers.BrowserProvider(window.ethereum)
    const auctionCoordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider);
    const retrieveCollectionRankings = async() => {
      let rankings = await auctionCoordinator.getTokenOccurrence();
      var activeBlockNumber = (await provider.getBlock('latest')).timestamp;
      var rankedVals = [];
      for(var i = 0; i < rankings.length; i++){
        var movingAverage = ((BigInt(activeBlockNumber) - BigInt(rankings[i][1])) * BigInt(60) + BigInt(rankings[i][2]) * BigInt(40)) / BigInt(100);
        rankedVals.push([rankings[i], movingAverage]);
      }
      var sortedRankedVals = rankedVals.sort((one, two) => (one[1] < two[1] ? -1 : 1));
      setTrendingCollections(sortedRankedVals.map((x) => x[0][0]));
    }
    const populateCollections = async () => {
      let collections = await auctionCoordinator.getAllCategories();
      setDisplayCollections(collections.map((x: string) => ethers.decodeBytes32String(x)));
    }
    populateCollections();
    retrieveCollectionRankings();
  },[props.activeAccount,props.numSellingItems,props.numSettledTransactions,auctionCoordinatorContract,state])
  return (
    <>
      <Head>
        <title>My DAPP</title>
      </Head>
      <Box p={2}>
        <AutoComplete onSelectOption={handleAutocompleteSearchTermChange}>
          <AutoCompleteInput variant="filled" placeholder='Search for collection' style={{backgroundColor: '#fef1df', borderColor: '#a3c139'}}/>
          <AutoCompleteList>
            <AutoCompleteCreatable />
            {displayCollections.map((category, cid) => (
              <AutoCompleteItem
                key={`option-${cid}`}
                value={category}
                label={category}
                textTransform="capitalize"
              >{category}</AutoCompleteItem>
            ))}
          </AutoCompleteList>
        </AutoComplete>
      </Box>
      <Accordion allowToggle>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex='1' textAlign='left'>
                How does it work?
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Box p={2}>
              <Box p={5} spacing={3} borderWidth="2px" borderRadius="lg" borderColor={'#f9af1d'} backgroundColor={'#fde5b5'}>
                <Heading my={4} fontSize='xl'>OrangeStand's ticketed store:</Heading>
                <List size="xl" variant="orange" p={4}>
                  <ListItem><ListIcon as={MdCheckCircle} color={'#a3c139'}/>Find an item you're interested in.</ListItem>
                  <ListItem><ListIcon as={MdCheckCircle} color={'#a3c139'}/>Buy a ticket.</ListItem>
                  <ListItem><ListIcon as={MdCheckCircle} color={'#a3c139'}/>Claim an item with a ticket</ListItem>
                  <ListItem><ListIcon as={MdCheckCircle} color={'#a3c139'}/>Wait for the timer to run out.</ListItem>
                  <ListItem><ListIcon as={MdCheckCircle} color={'#a3c139'}/>Last submitter of claim wins</ListItem>
                </List>
              </Box>
            </Box>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      <Box p={2} mb={0} w='100%' borderWidth="2px" borderRadius="lg" borderColor={'#a3c139'} hidden={areTrendingCollectionsHidden}>
        <Center>
          <Heading my={4}  fontSize='xl'>Trending collections</Heading>
        </Center>
        <SimpleGrid columns={2} spacing='24px'>
          {trendingCollections.map((collectionName, i) => (
              <Clickable as="div"
                spacing={4} borderWidth="2px" borderColor={'#a3c139'} borderRadius="lg" key={i}
                height='204px'
                bgImage={`url(http://localhost:3000/${collectionName}.png)`}
                bgPosition='left'
                _hover={{ bgImage: `url(http://localhost:3000/${collectionName}.png)`, opacity: '0.8' }}
                onClick={(event) => {displaySelectedCollection(`${collectionName}`);}}>
                  <Heading my={4} fontSize='xl'>{collectionName}</Heading>
              </Clickable>
            ))}
        </SimpleGrid>
      </Box>
      
      <SimpleGrid columns={3}>
      <Button hidden={!areTrendingCollectionsHidden} spacing='6px' margin='6px' style={{backgroundColor: '#a3c139'}}
        onClick={(event) => {loadMainScreen()}}><ArrowBackIcon/> Main</Button>
          <Center>
            <Heading my={4}  fontSize='xl'>{selectedCollection}</Heading>
          </Center>
      </SimpleGrid>
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
