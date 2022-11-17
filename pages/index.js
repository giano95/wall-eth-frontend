import Head from 'next/head'
import Image from 'next/image'
import DarkmodeToggle from '../components/DarkmodeToggle'
import styles from '../styles/Home.module.css'
import { getRandomAvatar } from '../utils/getRandomAvatar'
import { useAccount, useNetwork, useContract, useContractRead, useProvider, useSigner } from 'wagmi'
import { useEffect, useState } from 'react'
import { ethers } from 'ethers'

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
const contractAddresses = require('../constants/contractAddresses.json')
const contractAbis = require('../constants/contractAbis.json')

export default function Home() {
    // wagmi hook
    const { address, isConnecting, isDisconnected, isConnected } = useAccount()
    const { chain, chains } = useNetwork()
    const provider = useProvider()
    const { data: signer, isError, isLoading } = useSigner()

    // Staking
    const [stakingAmount, setStakingAmount] = useState(0.0)
    const [stakingInfo, setStakingInfo] = useState('')
    const [withdrawStakingInfo, setWithdrawStakingInfo] = useState('')
    const [stakingBalance, setStakingBalance] = useState(0.0)

    // Funding
    const [fundingAmount, setFundingAmount] = useState(0.0)
    const [fundingInfo, setFundingInfo] = useState('')
    const [withdrawFundingInfo, setWithdrawFundingInfo] = useState('')
    const [fundingBalance, setFundingBalance] = useState(0.0)

    async function handleStakeSubmit(e) {
        e.preventDefault()

        // Check that the amount is > 0
        if (stakingAmount <= 0) {
            setStakingInfo('Stake an amount > 0')
            return
        }

        // Parse the amount into wei
        const stakingAmountWei = ethers.utils.parseEther(stakingAmount.toString())

        // Initialize the contracts
        const wethAddress = contractAddresses[chain.id]['WETH']
        const wethAbi = contractAbis[chain.id]['ERC20']
        const wethContract = new ethers.Contract(wethAddress, wethAbi, signer)
        const tradingBotAddress = contractAddresses[chain.id]['TradingBotV3']
        const tradingBotAbi = contractAbis[chain.id]['TradingBotV3']
        const tradingBotContract = new ethers.Contract(tradingBotAddress, tradingBotAbi, signer)

        // Approve the bot contract to spend your WETH
        try {
            const txResponse = await wethContract.approve(tradingBotAddress, stakingAmountWei)
            setStakingInfo('Approving...')
            const txReceipt = await txResponse.wait()
            setStakingInfo('Approved!')
            console.log(txReceipt)
        } catch (error) {
            console.log(error)
            setStakingInfo('An error occured :(')
            return
        }

        // Wait 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Stake the amount into the contract
        try {
            const txResponse = await tradingBotContract.stake(stakingAmountWei, {
                gasLimit: 5000000,
            })
            setStakingInfo('Staking...')
            const txReceipt = await txResponse.wait()
            setStakingInfo('Staked!')
        } catch (error) {
            console.log(error)
            setStakingInfo('An error occured :(')
            return
        }

        // Update the displayed staking Balance and Reset the stakingAmount
        await updateBalances()
        setStakingAmount(0.0)
    }

    async function handleFundSubmit(e) {
        e.preventDefault()

        // Check that the amount is > 0
        if (fundingAmount <= 0) {
            setFundingInfo('Fund an amount > 0')
            return
        }

        // Parse the amount into wei
        const fundingAmountWei = ethers.utils.parseEther(fundingAmount.toString())

        // Initialize the contracts
        const linkAddress = contractAddresses[chain.id]['LINK']
        const linkAbi = contractAbis[chain.id]['ERC20']
        const linkContract = new ethers.Contract(linkAddress, linkAbi, signer)
        const tradingBotAddress = contractAddresses[chain.id]['TradingBotV3']
        const tradingBotAbi = contractAbis[chain.id]['TradingBotV3']
        const tradingBotContract = new ethers.Contract(tradingBotAddress, tradingBotAbi, signer)

        // Approve the bot contract to spend your WETH
        try {
            const txResponse = await linkContract.approve(tradingBotAddress, fundingAmountWei)
            setFundingInfo('Approving...')
            const txReceipt = await txResponse.wait()
            setFundingInfo('Approved!')
            console.log(txReceipt)
        } catch (error) {
            console.log(error)
            setFundingInfo('An error occured :(')
            return
        }

        // Wait 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Stake the amount into the contract
        try {
            const txResponse = await tradingBotContract.fund(fundingAmountWei, {
                gasLimit: 5000000,
            })
            setFundingInfo('Funding...')
            const txReceipt = await txResponse.wait()
            setFundingInfo('Fund!')
        } catch (error) {
            console.log(error)
            setFundingInfo('An error occured :(')
            return
        }

        // Update the displayed funding Balance and Reset the fundingAmount
        await updateBalances()
        setFundingAmount(0.0)
    }

    async function withdrawStaking() {
        // Initialize the contract
        const tradingBotAddress = contractAddresses[chain.id]['TradingBotV3']
        const tradingBotAbi = contractAbis[chain.id]['TradingBotV3']
        const tradingBotContract = new ethers.Contract(tradingBotAddress, tradingBotAbi, signer)

        // Withdraw the staking from the contract
        try {
            const txResponse = await tradingBotContract.unstake()
            setWithdrawStakingInfo('Withdrawing...')
            const txReceipt = await txResponse.wait()
            setWithdrawStakingInfo('Withdrawed!')
        } catch (error) {
            console.log(error)
            setWithdrawStakingInfo('An error occured :(')
            return
        }

        // Update the displayed staking Balance
        await updateBalances()
    }

    async function withdrawFunds() {
        // Initialize the contract
        const tradingBotAddress = contractAddresses[chain.id]['TradingBotV3']
        const tradingBotAbi = contractAbis[chain.id]['TradingBotV3']
        const tradingBotContract = new ethers.Contract(tradingBotAddress, tradingBotAbi, signer)

        // Withdraw the staking from the contract
        try {
            const txResponse = await tradingBotContract.withdrawFunds()
            setWithdrawFundingInfo('Withdrawing...')
            const txReceipt = await txResponse.wait()
            setWithdrawFundingInfo('Withdrawed!')
        } catch (error) {
            console.log(error)
            setWithdrawFundingInfo('An error occured :(')
            return
        }

        // Update the displayed staking Balance
        await updateBalances()
    }

    async function updateBalances() {
        const tradingBotAddress = contractAddresses[chain.id]['TradingBotV3']
        const tradingBotAbi = contractAbis[chain.id]['TradingBotV3']
        const tradingBotContract = new ethers.Contract(tradingBotAddress, tradingBotAbi, signer)

        const sBalance = await tradingBotContract.stakingBalance(address)
        const fBalance = await tradingBotContract.fundingBalance(address)

        setStakingBalance(ethers.utils.formatEther(sBalance))
        setFundingBalance(ethers.utils.formatEther(fBalance))
    }

    useEffect(() => {
        if (signer) {
            updateBalances()
        }
    }, [signer])

    if (isConnecting || isDisconnected) {
        return (
            <div className="min-h-screen w-full flex flex-col justify-center items-center">
                <div className="text-gray-800 dark:text-gray-300 text-3xl font-light">
                    Connect Your Wallet
                </div>
            </div>
        )
    }
    return (
        <div className="min-h-screen flex flex-col">
            <div className="w-full max-w-4xl mx-auto rounded-xl mt-32 px-6 flex flex-col justify-start items-center bg-white dark:bg-gray-850 shadow-md dark:shadow-lg">
                {/* - Staking Row - */}
                <div className="h-24 w-full px-3 flex flex-row justify-between items-start pt-5">
                    {/* - Staking Balance - */}
                    <div className="text-gray-800 dark:text-gray-300 flex flex-col justify-center items-start">
                        <div>Staking Balance</div>
                        <div>
                            <span className="text-black dark:text-white">{stakingBalance}</span>{' '}
                            WETH
                        </div>
                    </div>
                    {/* - Stake Form - */}
                    <div className="flex flex-col justify-center items-center">
                        <form onSubmit={handleStakeSubmit} className="flex flex-row">
                            <button
                                type="submit"
                                className="h-10 px-5 rounded-l-lg text-black dark:text-white bg-gradient-to-r from-green-400 to-blue-500 hover:from-pink-500 hover:to-yellow-500"
                            >
                                Stake
                            </button>
                            <input
                                className="h-10 w-36 text-start text-gray-500 dark:text-gray-850 bg-gray-100 dark:bg-gray-200 border-gray-100 dark:border-gray-200 rounded-r-lg"
                                name="stakingAmount"
                                id="stakingAmount"
                                type="number"
                                placeholder="Amount"
                                required={true}
                                value={stakingAmount}
                                onChange={(e) => setStakingAmount(e.target.value)}
                            />
                        </form>
                        <div className="mt-1.5 text-gray-800 dark:text-gray-300 text-sm font-semibold">
                            {stakingInfo}
                        </div>
                    </div>
                    {/* - Withdraw Button - */}
                    <div className="flex flex-col justify-center items-center">
                        <button
                            type="button"
                            onClick={withdrawStaking}
                            className="h-10 px-5 rounded-lg text-black dark:text-white bg-gradient-to-r from-green-400 to-blue-500 hover:from-pink-500 hover:to-yellow-500"
                        >
                            Withdraw
                        </button>
                        <div className="mt-1.5 text-gray-800 dark:text-gray-300 text-sm font-semibold">
                            {withdrawStakingInfo}
                        </div>
                    </div>
                </div>
                <div className="h-[1px] w-full bg-gradient-to-r from-green-400 to-blue-500"></div>
                {/* - Funding Row - */}
                <div className="h-24 w-full px-3 flex flex-row justify-between items-start pt-5">
                    {/* - Funding Balance - */}
                    <div className="text-gray-800 dark:text-gray-300 flex flex-col justify-center items-start">
                        <div>Funding Balance</div>
                        <div>
                            <span className="text-black dark:text-white">{fundingBalance}</span>{' '}
                            LINK
                        </div>
                    </div>
                    {/* - Stake Form - */}
                    <div className="flex flex-col justify-center items-center">
                        <form onSubmit={handleFundSubmit} className="flex flex-row">
                            <button
                                type="submit"
                                className="h-10 px-5 rounded-l-lg text-black dark:text-white bg-gradient-to-r from-green-400 to-blue-500 hover:from-pink-500 hover:to-yellow-500"
                            >
                                Fund
                            </button>
                            <input
                                className="h-10 w-36 text-start text-gray-500 dark:text-gray-850 bg-gray-100 dark:bg-gray-200 border-gray-100 dark:border-gray-200 rounded-r-lg"
                                name="fundingAmount"
                                id="fundingAmount"
                                type="number"
                                placeholder="Amount"
                                required={true}
                                value={fundingAmount}
                                onChange={(e) => setFundingAmount(e.target.value)}
                            />
                        </form>
                        <div className="mt-1.5 text-gray-800 dark:text-gray-300 text-sm font-semibold">
                            {fundingInfo}
                        </div>
                    </div>
                    {/* - Withdraw Button - */}
                    <div className="flex flex-col justify-center items-center">
                        <button
                            type="button"
                            onClick={withdrawFunds}
                            className="h-10 px-5 rounded-lg text-black dark:text-white bg-gradient-to-r from-green-400 to-blue-500 hover:from-pink-500 hover:to-yellow-500"
                        >
                            Withdraw
                        </button>
                        <div className="mt-1.5 text-gray-800 dark:text-gray-300 text-sm font-semibold">
                            {withdrawFundingInfo}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
