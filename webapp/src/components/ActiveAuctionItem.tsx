import React, { useEffect, useState } from 'react';
import { ERC721ABI as erc721Abi } from '../abi/ERC721ABI'
import { ERC20ABI as erc20Abi } from '../abi/ERC20ABI'
import { AuctionCoordinator as auctionCoordinatorAbi } from '../abi/AuctionCoordinator'
import { Auction as auctionAbi } from '../abi/Auction'
import { Bid as bidAbi } from '../abi/Bid'
import { Item as itemAbi } from '../abi/Item'
import { SingleErc721Item as singleErc721ItemAbi } from '../abi/SingleErc721Item'
import { SingleErc20Item as singleErc20ItemAbi } from '../abi/SingleErc20Item'
import { ethers } from 'ethers'
import { Button } from '@chakra-ui/react'
import { Image } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { Divider } from '@chakra-ui/react'
import { Progress, ProgressLabel } from '@chakra-ui/react'
import { Center } from '@chakra-ui/react'
import { Heading, Box } from "@chakra-ui/layout"
import { useToast } from '@chakra-ui/react'

interface Props {
    currentAccount: string | undefined,
    auctionId: number,
    auctionCoordinatorContract: string,
    paymentContract: string,
    activeAuctionRenderingList: React.MutableRefObject<any[]>,
    setActiveAuctionRenderingList: React.Dispatch<any[]>,
    numSettledTransactions: number,
    setNumSettledTransactions: React.Dispatch<number>,
    numBidsMade: React.MutableRefObject<number>,
    setNumBidsMade: React.Dispatch<number>,
}

declare let window: any;

export default function ActiveAuctionItem(props:Props){
    const [url, setUrl]=useState<string>()

    let [progressValue, updateProgressValue] = useState(0);
    let [currentPrice, updateCurrentPrice] = useState(0);
    let [nextPrice, updateNextPrice] = useState(0);
    let [priceIncrease, updatePriceIncrease] = useState(2);
    let [paymentBalance, updatePaymentBalance] = useState(0);
    let [timeLeft, updateTimeLeft] = useState("Time remaining: 00:00:00");
    let [statusText, updateStatusText] = useState("Finished!");
    
    let [isFinished, updateIsFinished] = useState(false);
    let [buttonText, updateButtonText] = useState("Claim item")

    let [headingText, setHeadingText] = useState("");
    const [buttonEnabled, setButtonEnabled]=useState<boolean>(false);
    const [intervalId, _setIntervalId]=useState<NodeJS.Timer|undefined>(undefined);
    const intervalIdRef = React.useRef(intervalId);
    const setIntervalId = (data: NodeJS.Timer) => {
      intervalIdRef.current = data;
      _setIntervalId(data);
    };

    const [activeAuction, _setActiveAuction] = useState<ethers.Contract|null>(null);
    const activeAuctionRef = React.useRef(activeAuction);
    const setActiveAuction = (data: ethers.Contract) => {
      activeAuctionRef.current = data;
      _setActiveAuction(data);
    };

    let [currentProvider, _setCurrentProvider] = useState<any>(null);
    const currentProviderRef = React.useRef(currentProvider);
    const setCurrentProvider = (data: ethers.BrowserProvider) => {
      currentProviderRef.current = data;
      _setCurrentProvider(data);
    };

    const toast = useToast()

    async function populateErc721Item(item: ethers.Contract, provider: ethers.BrowserProvider) {
      let singleErc721Address = await item.getErc721Item(1);
      const singleErc721 = new ethers.Contract(singleErc721Address, singleErc721ItemAbi, provider);
      let tokenId = await singleErc721.getTokenId();
      let erc721Address = await singleErc721.getTokenAddress();
      const erc721 = new ethers.Contract(erc721Address, erc721Abi, provider);
      let result = await erc721.tokenURI(tokenId);
      let res = await fetch(result);
      let json = await res.json();
      return {
        headingText: "BAYC #"+tokenId,
        imageUri: 'https://ipfs.io/ipfs/' + json.image.replace(/ipfs:\/\//g, ''),
      }
    }

    async function setUpProgressBar(){
      if(intervalIdRef.current != undefined){
        clearInterval(intervalIdRef.current);
      }
      const newIntervalId = setInterval(async function(){
        if(activeAuctionRef.current != null){
          let originalOwner = await activeAuctionRef.current.getOriginalOwner();
          let finished = await activeAuctionRef.current.isFinished();
          updateIsFinished(finished);
          let activeBid = await activeAuctionRef.current.getActiveBid();
          if(finished){
            const {buttonText, timeLeft, progressValue} = await handleFinishedAuction(activeBid, currentProviderRef.current, activeAuctionRef.current);
            updateButtonText(buttonText);
            updateTimeLeft(timeLeft);
            updateProgressValue(progressValue);
          }else {
            const {currentPrice, nextPrice, buttonText, progressValue, timeLeft, paymentTokenBalance, costOfMakingBid} 
              = await handleActiveAuction(activeAuctionRef.current, activeBid, currentProviderRef.current);
            updateCurrentPrice(+currentPrice);
            updateNextPrice(nextPrice);
            if(props.currentAccount != undefined && costOfMakingBid > paymentTokenBalance){
              updateButtonText("Not enought funds to make bid");
            } else if(props.currentAccount == undefined){
              updateButtonText("Connect wallet to claim");
            } else {
              updateButtonText(buttonText);
            }
            updateProgressValue(progressValue);
            updateTimeLeft(timeLeft);
          }
        }
      }, 1000);
      setIntervalId(newIntervalId);
    }

    async function populateErc20Item(item: ethers.Contract, provider: ethers.BrowserProvider) {
      let singleErc20Address = await item.getErc20Item(1);
      const singleErc20 = new ethers.Contract(singleErc20Address, singleErc20ItemAbi, provider);
      let erc20Address = await singleErc20.getTokenAddress();
      let quantity = await singleErc20.getQuantity();
      const erc20 = new ethers.Contract(erc20Address, erc20Abi, provider);
      let sym = await erc20.symbol();
      let decPlaces = await erc20.decimals();
      return {
        headingText: (Number(quantity) / (10 ** Number(decPlaces))) + " " + sym,
        imageUri: sym+'.png'
      }
    }

    async function handleFinishedAuction(activeBid: ethers.Contract, provider: ethers.BrowserProvider, activeAuction: ethers.Contract){
      var buttonText = "";
      var timeLeft = "";
      var progressValue = 100;
      let winningBidder = '0x0000000000000000000000000000000000000000';
      let originalOwner = await activeAuction.getOriginalOwner();
      
      if(activeBid.toString() != '0x0000000000000000000000000000000000000000' 
          && props.currentAccount != undefined){
        const bid = new ethers.Contract(activeBid.toString(), bidAbi, provider);
        winningBidder = await bid.getBidderAddress();
        updateStatusText("Finished!");
        if((props.currentAccount.toLowerCase() == originalOwner.toLowerCase() 
            || props.currentAccount.toLowerCase() == winningBidder.toLowerCase())){
          buttonText = "Settle";
          timeLeft = "Auction finished - winner was " + winningBidder;
        } else {
          buttonText = "Auction finished";
          timeLeft = "Auction finished";
        }
      } else if(props.currentAccount != undefined 
        && props.currentAccount.toLowerCase() == originalOwner.toLowerCase()){
        buttonText = "Settle";
        timeLeft = "Auction finished - no bidders";
        updateStatusText("Finished!")
      } else if(props.currentAccount == undefined){
        buttonText = "Auction finished";
        timeLeft = "Auction finished";
        updateStatusText("Finished!")
      }// This is the first bid!
      else {
        buttonText = "Auction finished";
        timeLeft = "Auction finished - no bidders";
        updateStatusText("Finished!")
      }
      return {
        buttonText: buttonText,
        timeLeft: timeLeft,
        progressValue: progressValue,
        winningBidder: winningBidder
      };
    }

    async function handleActiveAuction(auction: ethers.Contract, activeBid: ethers.Contract, provider: ethers.BrowserProvider){
      var currentPrice = 0;
      var buttonText = "Claim item";
      if(activeBid.toString() != '0x0000000000000000000000000000000000000000'){
        const bid = new ethers.Contract(activeBid.toString(), bidAbi, provider);
        currentPrice = Number(await bid.getBidPrice());
        
        const bidderAddress = await bid.getBidderAddress();
        if(props.currentAccount != undefined && bidderAddress.toLowerCase() === props.currentAccount.toLowerCase()){
          buttonText = "You're currently the highest bidder";
        }
      } else {
        currentPrice = Number(await auction.getInitialPrice());
      }
      let priceIncrease = await auction.getCycleDuration();
      var nextPrice = Number(currentPrice) + Number(priceIncrease);
      
      let costOfMakingBid = ethers.formatEther(await auction.getPriceIncrease());
      updatePriceIncrease(costOfMakingBid);
      updateStatusText("Cost to claim: " + costOfMakingBid);
      const {progressionValue, formattedTimeLeft} = await calculateTimeLeft(auction);
      var timeLeftAsString = "Time remaining: "+formattedTimeLeft;
      const signer = await provider.getSigner();
      const erc20 = new ethers.Contract(props.paymentContract, erc20Abi, signer);
      let paymentTokenBalance = 0;
      if(props.currentAccount != undefined){
        paymentTokenBalance = Number(await erc20.balanceOf(props.currentAccount));
      }
      let decimalPlaces = Number(await erc20.decimals());

      return{
        currentPrice: +currentPrice,
        nextPrice: nextPrice,
        buttonText: buttonText,
        progressValue: progressionValue,
        timeLeft: timeLeftAsString,
        paymentTokenBalance: paymentTokenBalance / (10 ** decimalPlaces),
        costOfMakingBid: costOfMakingBid,
      }
    }

    async function calculateTimeLeft(auction: ethers.Contract){
      let cycleStartTime = Number(await auction.getCurrentCycleStartTime());
      let cycleEndTime = Number(await auction.getCurrentCycleEndTime());
      let currentBlockTime = Number(await auction.getCurrentBlockTime());
      var currentBlock = new Date(currentBlockTime * 1000);
      var start = new Date(cycleStartTime * 1000);
      var end = new Date(cycleEndTime * 1000);
      var milliSecondsLeft = (end.getTime() - currentBlock.getTime());
      var totalDuration = end.getTime() - start.getTime();
      var timeLeft = new Date(0,0,0,0,0,0,milliSecondsLeft);
      var formattedTimeLeft = timeLeft.toISOString().substr(11,8)
      var progressionValue = (1 - (milliSecondsLeft / totalDuration)) * 100
      return {
        progressionValue: progressionValue,
        formattedTimeLeft: formattedTimeLeft
      }
    }

    //call when currentAccount change
    useEffect(()=>{
      if(!window.ethereum) return
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const auctionCoordinator = new ethers.Contract(props.auctionCoordinatorContract, auctionCoordinatorAbi, provider);
      setCurrentProvider(provider);

      const asyncCalls = async () => {
        let auctionAddress = await auctionCoordinator.getAuction(props.auctionId);
        const auction = new ethers.Contract(auctionAddress, auctionAbi, provider);
        setActiveAuction(auction);
        let itemAddress = await auction.getItem();
        const item = new ethers.Contract(itemAddress, itemAbi, provider);
        let numErc721Tokens = await item.numErc721Tokens();

        if(numErc721Tokens > 0){
          const { headingText, imageUri } = await populateErc721Item(item, provider);
          setHeadingText(headingText);
          setUrl(imageUri);
        } else {
          const { headingText, imageUri } = await populateErc20Item(item, provider);
          setHeadingText(headingText);
          setUrl(imageUri);
        }

        let finished = await auction.isFinished();
        updateIsFinished(finished);
        let activeBid = await auction.getActiveBid();
        let originalOwner = await auction.getOriginalOwner();
        let balanceForPaymentTokens = paymentBalance;
        let winner = '0x00';
        let bidCost = ethers.formatEther(await auction.getPriceIncrease());
        if(finished){
          const {buttonText, timeLeft, progressValue, winningBidder} = await handleFinishedAuction(activeBid, provider, auction);
          winner = winningBidder;
          if(props.currentAccount != undefined 
            && props.currentAccount.toLowerCase() == originalOwner.toLowerCase()){
            updateButtonText("Settle");
          } else if(props.currentAccount == undefined){
            updateButtonText("Auction finished");
          } else {
            updateButtonText(buttonText);
          }
          updateTimeLeft(timeLeft);
          updateProgressValue(progressValue);
        } else {
          const {currentPrice, nextPrice, buttonText, progressValue, timeLeft, paymentTokenBalance, costOfMakingBid} = 
            await handleActiveAuction(auction, activeBid, provider);
          balanceForPaymentTokens = paymentTokenBalance;
          updateCurrentPrice(+currentPrice);
          updateNextPrice(nextPrice);
          if(props.currentAccount != undefined && bidCost > paymentTokenBalance){
            updateButtonText("Not enought funds to make bid");
          } else if(props.currentAccount == undefined){
            updateButtonText("Connect wallet to claim");
          } else {
            updateButtonText(buttonText);
          }
          updateProgressValue(progressValue);
          updateTimeLeft(timeLeft);
          
          updatePaymentBalance(paymentTokenBalance);
        }
        setButtonEnabled(props.currentAccount != undefined && 
          (
            (!finished && balanceForPaymentTokens > bidCost)
            || (finished && (props.currentAccount.toLowerCase() == originalOwner.toLowerCase() 
              || props.currentAccount.toLowerCase() == winner.toLowerCase()))));
        setUpProgressBar();
      }
      asyncCalls();
    }, [props.currentAccount,props.auctionCoordinatorContract,props.auctionId])

    async function bidOnAuction() {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const auctionCoordinator = new ethers.Contract(props.auctionCoordinatorContract, auctionCoordinatorAbi, signer);
      
      const actionOnAuction = async () => {
        let auctionContract = await auctionCoordinator.getAuction(props.auctionId);
        const auction = new ethers.Contract(auctionContract, auctionAbi, provider);
        let auctionId = await auction.getId();
        if(!isFinished){
          const erc20 = new ethers.Contract(props.paymentContract, erc20Abi, signer);
          let priceIncrease = await auction.getPriceIncrease();
          let auctionCoordinatorAllowance = await erc20.allowance(props.currentAccount, auctionContract);
          var canMakeBid = true;
          if(auctionCoordinatorAllowance < priceIncrease){
            await erc20.approve(auctionContract, priceIncrease)
            .catch((error) => {
              toast({
                title: "Bid could not be set up!",
                status: 'error',
                variant: 'subtle',
                duration: 3000,
                isClosable: true,
              });
              canMakeBid = false;
            });
          }
          if(canMakeBid){
            await auctionCoordinator.makeBid(auctionId, globalThis.connectedAddress).catch((error) => {
              toast({
                title: "Bid could not be made!",
                status: 'error',
                variant: 'subtle',
                duration: 3000,
                isClosable: true,
              });
            });
            provider.once("block", (blockNumber) => {
              auction.once("BidUpdate(uint256,address,address,address,address)", (auctionId,newBidAddress,oldBidAddress,newBidder,oldBidder) => {
                if(props.currentAccount != undefined && props.currentAccount.toLowerCase() === newBidder.toLowerCase()){
                  toast({
                    title: "You're the highest bidder",
                    status: 'success',
                    variant: 'subtle',
                    duration: 5000,
                    isClosable: true,
                  });
                    auction.once("BidUpdate(uint256,address,address,address,address)", (auctionId2,newBidAddress2,oldBidAddress2,newBidder2,oldBidder2) => {
                      if(props.currentAccount != undefined && props.currentAccount.toLowerCase() === oldBidder2.toLowerCase()){
                        toast({
                          title: "You're no longer the highest bidder",
                          status: 'warning',
                          variant: 'subtle',
                          duration: 5000,
                          isClosable: true,
                        });
                      }
                    });
                }
                props.setNumBidsMade((currNumBidsMade: number) => currNumBidsMade + 1);
              });
            });
          }
        } else {
          finaliseAuction(auctionCoordinator, auctionId, auction);
        }
      }
      actionOnAuction();
    }

    async function finaliseAuction(auctionCoordinator: ethers.Contract, auctionId: number, auction: ethers.Contract) {
      await auctionCoordinator.settleAuction(auctionId).catch((error) => {
        toast({
          title: "Auction could not be settled - please try again",
          status: 'error',
          variant: 'subtle',
          duration: 3000,
          isClosable: true,
        });
      });
      auction.once("AuctionSettled", (auctionId,winningBidder,finalPrice) => {
        toast({
          title: "Auction has been settled",
          status: 'success',
          variant: 'subtle',
          duration: 5000,
          isClosable: true,
        });
        var updatedAuctionList = props.activeAuctionRenderingList.current.filter(obj => obj.num != auctionId);
        props.setActiveAuctionRenderingList(updatedAuctionList);
        props.setNumSettledTransactions(props.numSettledTransactions+1);
        props.setNumBidsMade((currNumBidsMade: number) => currNumBidsMade + 1);
      });
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
          <Heading my={4}  fontSize='xl'>{headingText}</Heading>
        </Center>
        <Stack
          divider={<Divider borderColor='gray.200' />}
          spacing={4}
          align='stretch'>
          <Box>
            <Progress value={progressValue} colorScheme='#f9af1d;' backgroundColor={'#fbf3a3'}>
              <ProgressLabel color="black">{timeLeft}</ProgressLabel>
            </Progress>
          </Box>
          <Box>{statusText}</Box>
          <Button isDisabled={!buttonEnabled} type="button" w='100%' onClick={bidOnAuction} style={{
                  backgroundColor: '#a3c139'
                }}>{buttonText}</Button>
        </Stack>
      </Box>
    )
  }