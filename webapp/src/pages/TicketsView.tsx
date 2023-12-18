import { Heading, Box } from "@chakra-ui/layout"
import { SimpleGrid } from '@chakra-ui/react'
import { useState, useEffect} from 'react'
import { ethers } from "ethers"
import { FixedNumber } from "ethers"
import { OrangeStandTicket as orangeStandTicketAbi} from '../abi/OrangeStandTicket'
import { OrangeStandSpentTicket as orangeStandSpentTicketAbi} from '../abi/OrangeStandSpentTicket'
import deployedContracts from '../../public/deployed_contracts.json';
import React from 'react';
import { AuctionCoordinator as auctionCoordinatorAbi} from '../abi/AuctionCoordinator'
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
  provider: ethers.BrowserProvider | undefined;
  numBidsMade: number;
}

export default function TicketsView(props:Props) {
  const [ticketCount, _setTicketCount] = useState<string>("0");
  let auctionCoordinatorContract = deployedContracts["auctionCoordinator"];
  let orangeStandTicketContract = deployedContracts["orangeStandTicketAddress"];
  let orangeStandSpentTicketContract = deployedContracts["orangeStandSpentTicketAddress"];
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
    const provider = new ethers.BrowserProvider(window.ethereum)
    if(auctionCoordinator == null){
      setAuctionCoordinator(new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, provider));
    }
  },[auctionCoordinatorContract,auctionCoordinator])

  useEffect(() => {
    if(!window.ethereum || props.activeAccount == undefined) {
      setTicketCount("0");
      return
    }
    const populateAuctions = async () => {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const orangeStandTicket = new ethers.Contract(orangeStandTicketContract, orangeStandTicketAbi, provider);
      const orangeStandSpentTicket = new ethers.Contract(orangeStandSpentTicketContract, orangeStandSpentTicketAbi, provider);
      if(props.activeAccount != undefined){
        let orangeStandTicketCount = await orangeStandTicket.balanceOf(props.activeAccount)
        setTicketCount(ethers.formatEther(orangeStandTicketCount));
      }
      if(orangeStandTicket != null){
        orangeStandTicket.removeAllListeners("TicketIssued");
      }
      if(orangeStandSpentTicket != null){
        orangeStandSpentTicket.removeAllListeners("TicketRedeemed");
      }
      orangeStandTicket.on("TicketIssued", ticketIssuedListener);
      orangeStandSpentTicket.on("TicketRedeemed", ticketRedeemedListener);
    }
    populateAuctions();
  },[props.activeAccount,props.numSellingItems,props.numSettledTransactions,props.numBidsMade])

  const ticketIssuedListener = (owner: string, amount: number, blockNumber: number) => {
      let fullAmountNumber = Number(ethers.formatEther(amount));
      let oldCount = Number(FixedNumber.fromString(ticketCountRef.current));
      let newCount = oldCount + fullAmountNumber;
      setTicketCount(FixedNumber.fromValue(newCount)+"");
      toast({
        title: fullAmountNumber + " new ticket(s) received",
        status: 'success',
        duration: 5000,
        variant: 'subtle',
        isClosable: true,
      })
  }

  const ticketRedeemedListener = (owner: string, amount: number, blockNumber: number) => {
      let fullAmountNumber = Number(ethers.formatEther(amount));
      let oldCount = Number(FixedNumber.fromString(ticketCountRef.current));
      let newCount = oldCount - fullAmountNumber;
      setTicketCount(FixedNumber.fromValue(newCount)+"");
      toast({
        title: fullAmountNumber + " tickets redeemed",
        status: 'success',
        duration: 5000,
        variant: 'subtle',
        isClosable: true,
      })
  }

  async function buyTickets() {
    const buyTicketAction = async () => {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const orangeStandTicket = new ethers.Contract(orangeStandTicketContract, orangeStandTicketAbi, await provider.getSigner());
      let decimalTranslatedAmount = ethers.parseUnits(ticketPurchaseAmount+"");
      await orangeStandTicket.mint(props.activeAccount, decimalTranslatedAmount);
    }

    buyTicketAction();
  }

  async function sellTickets() {
    const sellTicketAction = async () => {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const orangeStandSpentTicket = new ethers.Contract(orangeStandSpentTicketContract, orangeStandSpentTicketAbi, await provider.getSigner());
      let decimalTranslatedAmount = ethers.parseUnits(ticketSaleAmount+"");
      await orangeStandSpentTicket.burn(props.activeAccount, decimalTranslatedAmount);
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
