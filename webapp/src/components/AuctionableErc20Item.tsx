import React, {useEffect, useState } from 'react';
import { ERC20ABI as erc20Abi} from '../abi/ERC20ABI'
import { AuctionCoordinator as auctionCoordinatorAbi} from '../abi/AuctionCoordinator'
import {ethers} from 'ethers'
import {Button} from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { Divider } from '@chakra-ui/react'
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    PopoverFooter,
    Image,
  } from '@chakra-ui/react'
import {
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
  } from '@chakra-ui/react'

import { Center } from '@chakra-ui/react'
import { Heading, Box } from "@chakra-ui/layout"
import { useToast } from '@chakra-ui/react'

interface Props {
    addressContract: string,
    iteration: number,
    auctionCoordinatorContract: string,
    connectedAccount: string | undefined,
    balance: number,
    formattedBalance: number,
    orangeStandTicketAddress: string,
    orangeStandSpentTicketAddress: string,
    provider: ethers.BrowserProvider | undefined,
}

declare let window: any;

export default function AuctionableErc20Item(props:Props){
    const addressContract = props.addressContract
    const connectedAccount = props.connectedAccount;
    const auctionCoordinatorContract = props.auctionCoordinatorContract

    const [balance, setBalance]=useState<number>(0);
    const [symbol, setSymbol]=useState<string>();
    const [decimalPlaces, setDecimalPlaces]=useState<number>(0);

    const [initialPrice, setInitialPrice]=useState<number>(15);
    const [increaseValue, setIncreaseValue]=useState<number>(1);
    const [displayAmountValue, setDisplayAmountValue] = React.useState(0)
    const [amountValue, setAmountValue] = React.useState(0)
    const handleChange = (value) => setDisplayAmountValue(value)
    const [costValue, setCostValue]=useState<number>(1);

    const toast = useToast()

    //call when currentAccount change
    useEffect(()=>{
      if(connectedAccount == undefined) return
      var isValueNull = props.provider == null;
      const erc20 = new ethers.Contract(addressContract, erc20Abi, props.provider!)

      const createItem = async () => {
        await createErc20AuctionItem(erc20, connectedAccount);
      }
      createItem();
      
    }, [addressContract,connectedAccount])

    async function createErc20AuctionItem(erc20: ethers.Contract, account: string | undefined){
      let bal = Number(await erc20.balanceOf(account));
      let sym = await erc20.symbol();
      let decPlaces = Number(await erc20.decimals());
      setSymbol(sym);
      setBalance(bal / (10 ** decPlaces));
      setDecimalPlaces(decPlaces);
      setAmountValue(+bal);
      setDisplayAmountValue(bal / (10 ** decPlaces));
    }

    function invalidInput(amountValue, cycleDuration, initialPrice, priceIncrease, decPlaces){
      let invalidInput = false;
      if(amountValue < 1){ 
        toast({
          title: "Specified amount is too small - you need to increase the amount",
          status: 'error',
          variant: 'subtle',
          duration: 3000,
          isClosable: true,
        });
        invalidInput = true;
      }
      if(cycleDuration % 1 != 0){ 
        toast({
          title: "Bidding period in minutes can't be a fraction",
          status: 'error',
          variant: 'subtle',
          duration: 3000,
          isClosable: true,
        });
        invalidInput = true;
      }
      if((initialPrice * (10 ** decPlaces)) < 1){ 
        toast({
          title: "Initial price is too small - you need to increase the amount",
          status: 'error',
          variant: 'subtle',
          duration: 3000,
          isClosable: true,
        });
        invalidInput = true;
      }
      if((priceIncrease * (10 ** decPlaces)) < 1){ 
        toast({
          title: "Bid cost is too small - you need to increase the amount",
          status: 'error',
          variant: 'subtle',
          duration: 3000,
          isClosable: true,
        });
        invalidInput = true;
      }
      return invalidInput;
    }
  
    async function createAuction(){
      let rawAmountValue = +displayAmountValue * (10 ** decimalPlaces);
      if(invalidInput(rawAmountValue, increaseValue, initialPrice, costValue, decimalPlaces)) return;
      const signer = await props.provider!.getSigner()

      const auctionCoordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, signer);
      const erc20 = new ethers.Contract(addressContract, erc20Abi, signer);

      let auctionCoordinatorAllowance = await erc20.allowance(connectedAccount, auctionCoordinatorContract);
      var canMakeBid = true;
      if(auctionCoordinatorAllowance < rawAmountValue){
        await erc20.approve(auctionCoordinatorContract, rawAmountValue.toString())
          .catch((error) => {
            toast({
              title: "Transaction couldn't be approved!",
              status: 'error',
              variant: 'subtle',
              duration: 3000,
              isClosable: true,
            });
            canMakeBid = false;
          });
        }
      if(canMakeBid){
        await auctionCoordinator.createErc20Auction(await erc20.getAddress(), rawAmountValue.toString(), 
          connectedAccount, increaseValue, 
          //initialPrice, 
          ethers.parseUnits(initialPrice.toLocaleString('fullwide', {useGrouping:false}), "ether"),
          props.orangeStandTicketAddress, 
          ethers.parseUnits(costValue.toLocaleString('fullwide', {useGrouping:false}), "ether"), 
          props.orangeStandSpentTicketAddress)
        .catch((error) => {
          toast({
            title: "Auction couldn't be set up!",
            status: 'error',
            variant: 'subtle',
            duration: 3000,
            isClosable: true,
          });
        });
      }
      
      //await erc20.transfer(auctionCoordinatorContract, rawAmountValue.toString());
      
    }

    return (
      <Box  mb={0} p={4} w='100%' borderWidth="2px" borderRadius="lg" borderColor={'#a3c139'}>
            <Center>
              <Image
                objectFit='cover'
                src={symbol + '.png'}
                alt={symbol}
                width='322px'
                height='322px'
              />
            </Center>
            <Center>
              <Heading my={4}  fontSize='xl'>{props.formattedBalance} {symbol}</Heading>
            </Center>
            <Stack
              divider={<Divider borderColor='gray.200' />}
              spacing={4}
              align='stretch'>
              <Popover>
                {({ isOpen, onClose }) => (
                <>
                  <PopoverTrigger>
                      <Button type="button" w='100%' style={{
                          backgroundColor: '#a3c139'
                        }}>
                          Create Auction...
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent bg={'#fef1df;'}>
                      <PopoverBody border='0'
                          display='flex'
                          alignItems='center'
                          justifyContent='space-between'
                          pb={4}>
                          <Box>Amount:</Box>
                          <NumberInput maxW='100px' mr='2rem' value={displayAmountValue} step={balance/10} min={0} max={balance} onChange={handleChange}>
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
                          justifyContent='space-between'
                          pb={4}>
                          <Box>Initial price:</Box>
                          <NumberInput maxW='100px' mr='2rem' min={0} defaultValue={initialPrice} onChange={(val) => setInitialPrice(+val)}>
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
                          justifyContent='space-between'
                          pb={4}>
                          <Box>Bidding period in minutes:</Box>
                          <NumberInput maxW='100px' mr='2rem' min={0} defaultValue={increaseValue} onChange={(val) => setIncreaseValue(+val)}>
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
                          justifyContent='space-between'
                          pb={4}>
                          <Box>Bid cost:</Box>
                          <NumberInput maxW='100px' mr='2rem' min={0} defaultValue={costValue} onChange={(val) => setCostValue(+val)}>
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
                            <Button colorScheme='blue' onClick={() => {
                              createAuction()
                              onClose()
                            }} style={{
                  backgroundColor: '#a3c139',
                  color: 'black'
                }}>Start auction</Button>
                      </PopoverBody>
                      <PopoverFooter>All auctions will have a 10 minute bidding period</PopoverFooter>
                  </PopoverContent>
                  </>
                )}
              </Popover>
            </Stack>
          </Box>
    )
  }