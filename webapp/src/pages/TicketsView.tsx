import { Heading, Box } from "@chakra-ui/layout"
import { SimpleGrid } from '@chakra-ui/react'
import { useState, useEffect} from 'react'
import { ethers } from "ethers"
import { FixedNumber } from "ethers"
import { OrangeStandTicket as orangeStandTicketAbi} from 'abi/OrangeStandTicket'
import deployedContracts from '../../public/deployed_contracts.json';
import React from 'react';
import { AuctionCoordinator as auctionCoordinatorAbi} from 'abi/AuctionCoordinator'
import { useToast } from '@chakra-ui/react'
import { Contract } from 'ethers'

import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Center,
    Button,
    Image,
  } from '@chakra-ui/react'

declare let window:any

interface Props {
  activeAccount: string | undefined;
  numSettledTransactions: number;
  numSellingItems: number;
  setNumSellingItems: React.Dispatch<React.SetStateAction<number>>;
  provider: ethers.providers.Web3Provider | undefined;
  numBidsMade: number;
}

export default function TicketsView(props:Props) {
  const [ticketCount, _setTicketCount] = useState<string>("0");
  let auctionCoordinatorContract = deployedContracts["auctionCoordinator"];
  let orangeStandTicketContract = deployedContracts["orangeStandTicketAddress"];
  const [auctionCoordinator, setAuctionCoordinator] = useState<Contract|null>(null);
  const [ticketPurchaseAmount, setTicketPurchaseAmount]=useState<number>(1);
  const [ticketSaleAmount, setTicketSaleAmount]=useState<number>(0);
  let startingBlockNumber = 0;

  // Required for events to access the latest TypeScript state
  const ticketCountRef = React.useRef(ticketCount);

  const setTicketCount: React.Dispatch<string> = data => {
    ticketCountRef.current = data;
    _setTicketCount(data);
  };

  const toast = useToast()

  useEffect(() => {
    if(props.activeAccount == undefined){
      setTicketCount("0");
      return
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    if(auctionCoordinator == null){
      setAuctionCoordinator(new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider.getSigner()));
    }
  },[auctionCoordinatorContract,auctionCoordinator])

  useEffect(() => {
    if(!window.ethereum || props.activeAccount == undefined) {
      setTicketCount("0");
      return
    }
    const populateAuctions = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      
      const orangeStandTicket = new ethers.Contract(orangeStandTicketContract, orangeStandTicketAbi, provider);
      if(props.activeAccount != undefined){
        let orangeStandTicketCount = await orangeStandTicket.balanceOf(props.activeAccount)
        setTicketCount(ethers.utils.formatEther(orangeStandTicketCount));
      }

      if(auctionCoordinator != null){
        auctionCoordinator.removeAllListeners("TicketIssued");
        auctionCoordinator.removeAllListeners("TicketRedeemed");
      }

      provider.once("block", (blockNumber) => {
        startingBlockNumber = blockNumber;
        if(auctionCoordinator == null){
          let newAuctionCoordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider.getSigner());
          newAuctionCoordinator.on("TicketRedeemed", ticketRedeemedListener);
          newAuctionCoordinator.on("TicketIssued", ticketIssuedListener);
          setAuctionCoordinator(newAuctionCoordinator);
        } else {
          auctionCoordinator.on("TicketRedeemed", ticketRedeemedListener);
          auctionCoordinator.on("TicketIssued", ticketIssuedListener);
        }
      })
    }
    populateAuctions();
  },[props.activeAccount,props.numSellingItems,props.numSettledTransactions,props.numBidsMade])

  const ticketIssuedListener = (owner: string, amount: number, blockNumber: number) => {
    if(startingBlockNumber < blockNumber){
      let fullAmountNumber = Number(ethers.utils.formatEther(amount));
      let oldCount = Number(FixedNumber.fromString(ticketCountRef.current));
      let newCount = oldCount + fullAmountNumber;
      setTicketCount(FixedNumber.from(newCount)+"");
      toast({
        title: fullAmountNumber + " new ticket(s) received",
        //description: ''+fullAmountNumber,
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

  const ticketRedeemedListener = (owner: string, amount: number, blockNumber: number) => {
    if(startingBlockNumber < blockNumber){
      let fullAmountNumber = Number(ethers.utils.formatEther(amount));
      let oldCount = Number(FixedNumber.fromString(ticketCountRef.current));
      let newCount = oldCount - fullAmountNumber;
      setTicketCount(FixedNumber.from(newCount)+"");
      toast({
        title: fullAmountNumber + " tickets redeemed",
        //description: ''+fullAmountNumber,
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

  async function buyTickets() {
    const buyTicketAction = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const orangeStandTicket = new ethers.Contract(orangeStandTicketContract, orangeStandTicketAbi, provider);
      let decimalTranslatedAmount = FixedNumber.from(ticketPurchaseAmount);
      let coordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider.getSigner())
      await coordinator.createTickets(decimalTranslatedAmount, props.activeAccount);
    }

    buyTicketAction();
  }

  async function sellTickets() {
    const sellTicketAction = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      let decimalTranslatedAmount = FixedNumber.from(ticketSaleAmount);
      let coordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider.getSigner())
      await coordinator.redeemTickets(decimalTranslatedAmount, props.activeAccount);
    }
    sellTicketAction();
  }

  return (
    <Box  mb={0} p={4} w='100%' borderWidth="2px" borderRadius="lg" borderColor={'#a3c139'}>
      <Center>
        <Image boxSize='180px' src={'sim.png'}></Image>
      </Center>
      <Center>
        <Heading my={4}  fontSize='xl'>Your tickets: {ticketCountRef.current}</Heading>
      </Center>
      <SimpleGrid columns={2}
        spacing={4}>
        <Popover>
            <PopoverTrigger>
                <Button type="button" w='100%' style={{
                    backgroundColor: '#a3c139'
                  }}>
                    Buy Tickets...
                </Button>
            </PopoverTrigger>
            <PopoverContent bg={'#fef1df;'}>
                <PopoverBody border='0'
                    display='flex'
                    alignItems='center'
                    justifyContent='space-between'
                    pb={4}>
                    <Box>Amount:</Box>
                    <NumberInput maxW='100px' mr='2rem' defaultValue={ticketPurchaseAmount} min='0' onChange={(val) => setTicketPurchaseAmount(+val)}>
                        <NumberInputField />
                        <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                </PopoverBody>
                <PopoverBody border='0'
                    display='flex'
                    alignItems='center'
                    alignContent={'right'}
                    justifyContent='flex-end'
                    pb={4}>
                      <Button colorScheme='blue' 
                      onClick={buyTickets} 
                      style={{
            backgroundColor: '#a3c139',
            color: 'black'
          }}>Buy Tickets</Button>
                </PopoverBody>
            </PopoverContent>
        </Popover>
        <Popover>
            <PopoverTrigger>
                <Button type="button" w='100%' style={{
                    backgroundColor: '#a3c139'
                  }}>
                    Sell Tickets...
                </Button>
            </PopoverTrigger>
            <PopoverContent bg={'#fef1df;'}>
                <PopoverBody border='0'
                    display='flex'
                    alignItems='center'
                    justifyContent='space-between'
                    pb={4}>
                    <Box>Amount</Box>
                    <NumberInput maxW='100px' mr='2rem' min='0' max={ticketCountRef.current} defaultValue={ticketCountRef.current}  onChange={(val) => setTicketSaleAmount(+val)}>
                        <NumberInputField />
                        <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                </PopoverBody>
                <PopoverBody border='0'
                    display='flex'
                    alignItems='center'
                    onClick={sellTickets} 
                    alignContent={'right'}
                    justifyContent='flex-end'
                    pb={4}>
                      <Button colorScheme='blue' style={{
            backgroundColor: '#a3c139',
            color: 'black'
          }}>Sell Tickets</Button>
                </PopoverBody>
            </PopoverContent>
        </Popover>
      </SimpleGrid>
    </Box>
  )
}
