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
  
    async function createAuction(){
      let rawAmountValue = +displayAmountValue * (10 ** decimalPlaces);
      const signer = await props.provider!.getSigner()

      const auctionCoordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, signer);
      const erc20 = new ethers.Contract(addressContract, erc20Abi, signer);

      await erc20.transfer(auctionCoordinatorContract, rawAmountValue.toString());
      console.log("Auction coordinator contract: " + auctionCoordinatorContract)
      await auctionCoordinator.createErc20Auction(erc20.address, rawAmountValue.toString(), connectedAccount, increaseValue, 
        initialPrice, props.orangeStandTicketAddress, ethers.parseUnits(costValue.toString(), "ether"), props.orangeStandSpentTicketAddress);
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
                          <NumberInput maxW='100px' mr='2rem' defaultValue={initialPrice} onChange={(val) => setInitialPrice(+val)}>
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
                          <NumberInput maxW='100px' mr='2rem' defaultValue={increaseValue} onChange={(val) => setIncreaseValue(+val)}>
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
                          <NumberInput maxW='100px' mr='2rem' defaultValue={costValue} onChange={(val) => setCostValue(+val)}>
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