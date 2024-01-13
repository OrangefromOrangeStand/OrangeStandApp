import React, {useEffect, useState } from 'react';
import { ERC721ABI as erc721Abi} from '../abi/ERC721ABI'
import { AuctionCoordinator as auctionCoordinatorAbi} from '../abi/AuctionCoordinator'
import {ethers} from 'ethers'
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    PopoverFooter,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Center,
    useToast,
    Button,
    Image,
    Stack,
    Spinner,
    Divider,
    useDisclosure,
  } from '@chakra-ui/react'
import { Heading, Box } from "@chakra-ui/layout"

interface Props {
    addressContract: string;
    iteration: number;
    auctionCoordinatorContract: string;
    orangeStandTicketAddress: string;
    orangeStandSpentTicketAddress: string;
}

declare let window: any;

export default function AuctionableErc721Item(props:Props){
    const { isOpen, onOpen, onClose } = useDisclosure()
    const addressContract = props.addressContract
    const iteration = props.iteration
    const auctionCoordinatorContract = props.auctionCoordinatorContract
    const [url,setUrl]=useState<string>()
    const [number,setNumber]=useState<number>()

    const [initialValue, setInitialValue]=useState<number>(15);
    const [increaseValue, setIncreaseValue]=useState<number>(1);
    const [costValue, setCostValue]=useState<number>(1);
    const [buttonDisabled, setButtonDisabled]=useState<boolean>(false);

    const toast = useToast()

    //call when currentAccount change
    useEffect(()=>{
      if(addressContract == undefined) return
  
      const provider = new ethers.BrowserProvider(window.ethereum)
      const erc721 = new ethers.Contract(addressContract, erc721Abi, provider)

      const createItem = async () => {
        const {tokenId, imageUri } = await createErc721AuctionItem(erc721, iteration);
        setNumber(tokenId);
        setUrl(imageUri);
      }
      createItem();
      return () => {}
    }, [addressContract,iteration])

    async function createErc721AuctionItem(erc721: ethers.Contract, tokenId: number){
      let uri = await erc721.tokenURI(tokenId);
      var res = await fetch(uri);
      var json = await res.json();
      return {
        tokenId: +tokenId,
        imageUri: 'https://ipfs.io/ipfs/' + json.image.replace(/ipfs:\/\//g, '')
      }
    }

    function invalidInput(cycleDuration, initialPrice, priceIncrease, decPlaces){
      let invalidInput = false;
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
      let decimalPlaces = 18;
      if(invalidInput(increaseValue, initialValue, costValue, decimalPlaces)) return;
      //if(invalidInput(increaseValue, initialValue, ethers.parseUnits(costValue.toString(), "ether"))) return;
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const auctionCoordinator = new ethers.Contract(auctionCoordinatorContract, auctionCoordinatorAbi, signer);
      const erc721 = new ethers.Contract(addressContract, erc721Abi, signer);
      
      let approvedAddress = await erc721.getApproved(iteration);
      var canMakeBid = true;
      console.log("Approved address " + approvedAddress + " and "+auctionCoordinatorContract)
      if(!(auctionCoordinatorContract===approvedAddress)){
        await erc721.approve(auctionCoordinatorContract, iteration)
        .catch((error) => {
          toast({
            title: "Auction couldn't be set up!",
            status: 'error',
            variant: 'subtle',
            duration: 3000,
            isClosable: true,
          });
          console.log("Approval: "+error)
          canMakeBid = false;
        });
      }
      if(canMakeBid){
        console.log("Val1 " + increaseValue);
        console.log("Val2 " + initialValue);
        console.log("Val2.1 " + ethers.parseUnits(initialValue.toLocaleString('fullwide', {useGrouping:false}), "ether"));
        console.log("Val3 " + (costValue.toLocaleString('fullwide', {useGrouping:false})));
        await auctionCoordinator.createErc721Auction(await erc721.getAddress(), iteration, 
          globalThis.connectedAddress, increaseValue,
          //initialValue.toLocaleString('fullwide', {useGrouping:false}),
          ethers.parseUnits(initialValue.toLocaleString('fullwide', {useGrouping:false}), "ether"),
          //initialValue, 
          props.orangeStandTicketAddress,
          ethers.parseUnits(costValue.toLocaleString('fullwide', {useGrouping:false}), "ether"),
          props.orangeStandSpentTicketAddress)
        //await auctionCoordinator.createErc20Auction(await erc20.getAddress(), rawAmountValue.toString(), 
          //connectedAccount, increaseValue, 
        //initialPrice, 
        //props.orangeStandTicketAddress, 
        //ethers.parseUnits(costValue.toLocaleString('fullwide', {useGrouping:false}), "ether"), 
        //props.orangeStandSpentTicketAddress)
        .catch((error) => {
          toast({
            title: "Auction couldn't be set up!",
            status: 'error',
            variant: 'subtle',
            duration: 3000,
            isClosable: true,
          });
          console.log("Auction creation: "+error)
        });
      }

      /*await erc721.approve(auctionCoordinatorContract, iteration)
      .then(async (returnedResponse) => {
        await auctionCoordinator.createErc721Auction((await erc721.getAddress()), iteration, 
          globalThis.connectedAddress, increaseValue, 
          initialValue, 
          props.orangeStandTicketAddress,
          ethers.parseUnits(costValue.toString(), "ether"),
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
      })
      .catch((error) => {
        toast({
          title: "Transaction couldn't be approved!",
          status: 'error',
          variant: 'subtle',
          duration: 3000,
          isClosable: true,
        });
      });*/
    }

    
  
    return (
      <Box  mb={0} p={4} w='100%' borderWidth="2px" borderRadius="lg" borderColor={'#a3c139'}>
            <Center>
              <Image
                objectFit='cover'
                src={url}
                alt={url}
                width='322px'
                height='322px'
              />
            </Center>
            <Center>
              <Heading my={4}  fontSize='xl'>BAYC #{number}</Heading>
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
                          <Box>Initial price:</Box>
                          <NumberInput maxW='100px' min={0} mr='2rem' defaultValue={initialValue} onChange={(val) => setInitialValue(+val)}>
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
                          <NumberInput maxW='100px' min={0} mr='2rem' defaultValue={increaseValue} onChange={(val) => setIncreaseValue(+val)}>
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
                          <NumberInput maxW='100px' min={0} mr='2rem' defaultValue={costValue} onChange={(val) => setCostValue(+val)}>
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
                            <Button disabled={buttonDisabled} colorScheme='blue' onClick={() => {
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