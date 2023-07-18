import { useEffect, useState } from 'react'
import Head from 'next/head'
import {
  Box,
  Heading,
  Container,
  Text,
  Button,
  Stack,
  Input,
  Center,
  Flex,
  Avatar,
  Image,
} from '@chakra-ui/react'
import { ethers } from 'ethers'
import QRCode from 'react-qr-code'
import { client, challenge, authenticate, getDefaultProfile } from './api'
import {
  createIdentity,
  claimQrCode,
  createClaim,
  generateQRCode,
} from '../lib/id'

export default function Home() {
  /* local state variables to hold user's address and access token */
  const [address, setAddress] = useState()
  const [token, setToken] = useState()
  const [issuerDID, setIssuerDID] = useState()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [lensName, setLensName] = useState()
  const [lensID, setLensID] = useState()
  const [lensStats, setLensStats] = useState()
  const [lensBio, setLensBio] = useState()
  const [lensPicture, setLensPicture] = useState()
  const [userDID, setUserDID] = useState()
  const [jsonLD, setJsonLD] = useState()
  const [qrCode, setQrCode] = useState()

  useEffect(() => {
    /* when the app loads, check to see if the user has already connected their wallet */
    checkConnection()
  }, [])
  async function checkConnection() {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const accounts = await provider.listAccounts()
    if (accounts.length) {
      setAddress(accounts[0])
    }
  }
  async function connect() {
    /* this allows the user to connect their wallet */
    const account = await window.ethereum.send('eth_requestAccounts')
    if (account.result.length) {
      setAddress(account.result[0])
    }
  }
  async function login() {
    try {
      /* first request the challenge from the API server */
      const challengeInfo = await client.query({
        query: challenge,
        variables: { address },
      })
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      /* ask the user to sign a message with the challenge info returned from the server */
      const signature = await signer.signMessage(
        challengeInfo.data.challenge.text
      )
      /* authenticate the user */
      const authData = await client.mutate({
        mutation: authenticate,
        variables: {
          address,
          signature,
        },
      })
      /* if user authentication is successful, you will receive an accessToken and refreshToken */
      const {
        data: {
          authenticate: { accessToken },
        },
      } = authData
      console.log({ accessToken })
      window.localStorage.setItem('lens-auth-token', accessToken)
      setToken(accessToken)

      const profileQuery = await client.query({
        query: getDefaultProfile,
        variables: { address },
      })

      const {
        data: {
          defaultProfile: { picture, name, bio, stats, id },
        },
      } = profileQuery

      setLensID(id)
      setLensName(name)
      setLensStats(stats)
      setLensBio(bio)
      setLensPicture(picture.original.url)
    } catch (err) {
      console.log('Error signing in: ', err)
    }
  }

  async function getissuerDID() {
    try {
      const identityPayload = {
        didMetadata: {
          method: 'polygonid',
          blockchain: 'polygon',
          network: 'mumbai',
        },
      }

      const identityRequest = await createIdentity(identityPayload)
      const { identifier } = identityRequest.data
      setIssuerDID(identifier)
    } catch (err) {
      console.log('Error fetching profile: ', err)
    }
  }

  async function generateClaim(_issuerDID, _userDID) {
    try {
      setLoading(true)
      setStatus('Creating the VC...')
      const claim = await createClaim(
        _issuerDID,
        _userDID,
        lensID,
        lensStats.totalFollowing
      )
      const { id } = claim.data

      setStatus('Requesting Claim JSON-LD...')
      const claimQr = await claimQrCode(_issuerDID, id)
      const claimJSONLD = claimQr.data

      setStatus('Creating QR Code...')
      setJsonLD(claimJSONLD)
      showQRCode(claimJSONLD)
    } catch (err) {
      console.log('Error Generating Claim: ', err)
      setLoading(false)
      setStatus('')
    }
  }

  async function showQRCode(body) {
    try {
      setLoading(true)
      setStatus('Generating QR Code...')

      const qrResponse = await generateQRCode(body)
      console.log(qrResponse)
      const { png } = qrResponse.data

      setQrCode(png)
      setLoading(false)
      setStatus('')
    } catch (e) {
      console.log('Error Generating QRCode: ', e)
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Lens ID PoC</title>
      </Head>

      <Container maxW={'3xl'}>
        <Stack
          as={Box}
          textAlign={'center'}
          spacing={{ base: 8, md: 14 }}
          py={{ base: 20, md: 36 }}
        >
          <Heading
            fontWeight={600}
            fontSize={{ base: '2xl', sm: '4xl', md: '6xl' }}
            lineHeight={'110%'}
          >
            Welcome to the{' '}
            <Text as={'span'} color={'#804AE1'}>
              Polygon ID
            </Text>{' '}
            and{' '}
            <Text as={'span'} color={'#ABFF2C'}>
              Lens
            </Text>{' '}
            Sample Project
          </Heading>
          <Text color={'gray.500'} fontSize='2xl'>
            This is a proof of concept designed to demonstrate the happy path
            implementation of Polygon ID with Lens. If you have a Lens profile,
            go ahead and click the button below.
          </Text>
          <Stack
            direction={'column'}
            spacing={3}
            align={'center'}
            alignSelf={'center'}
            position={'relative'}
          >
            {!address && (
              <Button
                colorScheme={'green'}
                bg={'blue.400'}
                rounded={'full'}
                px={6}
                onClick={connect}
              >
                Connect Wallet
              </Button>
            )}
            {address && !token && (
              <>
                <Button
                  colorScheme={'green'}
                  bg={'#ABFF2C'}
                  rounded={'full'}
                  px={6}
                  _hover={{
                    bg: 'blue.500',
                  }}
                  onClick={login}
                >
                  Login to Lens
                </Button>
                <Text color={'gray.500'}>
                  Check your Wallet after clicking this button
                </Text>
              </>
            )}

            {address && token && !issuerDID && (
              <Button
                colorScheme={'green'}
                bg={'#804AE1'}
                rounded={'full'}
                px={6}
                _hover={{
                  bg: 'purple.800',
                }}
                onClick={getissuerDID}
              >
                Create Polygon ID Issuer
              </Button>
            )}
            <Flex gap={20}>
              {address && lensStats && token && (
                <>
                  <Center py={6}>
                    <Box
                      maxW={'500px'}
                      w={'xl'}
                      bg={'white'}
                      boxShadow={'2xl'}
                      rounded={'md'}
                      overflow={'hidden'}
                    >
                      <Heading mt={4} color={'#804AE1'} fontSize={'3xl'}>
                        Lens Profile
                      </Heading>
                      <Flex justify={'center'} mt={2}>
                        <Avatar
                          size={'xl'}
                          src={lensPicture}
                          alt={lensName}
                          css={{
                            border: '2px solid white',
                          }}
                        />
                      </Flex>

                      <Box p={6}>
                        <Stack spacing={0} align={'center'} mb={5}>
                          <Heading
                            fontSize={'2xl'}
                            fontWeight={500}
                            fontFamily={'body'}
                          >
                            {lensName}
                          </Heading>
                          <Text color={'gray.500'}>{lensBio}</Text>
                        </Stack>

                        <Stack direction={'row'} justify={'center'} spacing={6}>
                          <Stack spacing={0} align={'center'}>
                            <Text fontWeight={600}>
                              {lensStats.totalFollowers}
                            </Text>
                            <Text fontSize={'sm'} color={'gray.500'}>
                              Followers
                            </Text>
                          </Stack>
                          <Stack spacing={0} align={'center'}>
                            <Text fontWeight={600}>
                              {lensStats.totalFollowing}
                            </Text>
                            <Text fontSize={'sm'} color={'gray.500'}>
                              Following
                            </Text>
                          </Stack>
                        </Stack>
                      </Box>
                    </Box>
                  </Center>
                </>
              )}

              {address && issuerDID && token && (
                <>
                  <Center py={6}>
                    <Box
                      maxW={'500px'}
                      w={'xl'}
                      bg={'white'}
                      boxShadow={'2xl'}
                      rounded={'md'}
                      overflow={'hidden'}
                    >
                      <Box p={6}>
                        <Heading color={'#804AE1'} fontSize={'3xl'}>
                          Polygon ID Profile
                        </Heading>
                        <Stack spacing={0} align={'center'} mb={5}>
                          <Heading
                            fontSize={'2xl'}
                            fontWeight={500}
                            fontFamily={'body'}
                            pt={4}
                          >
                            Issuer Created
                          </Heading>
                          <Text
                            pt={4}
                            wordBreak={'break-word'}
                            color={'gray.500'}
                          >
                            Issuer DID: {issuerDID}
                          </Text>
                          <Text pt={8}>
                            Enter your DID from the Polygon Wallet to Create a
                            Verifiable Credential
                          </Text>
                          <Input
                            pt={4}
                            mb={32}
                            placeholder='Enter DID'
                            onChange={(e) => setUserDID(e.target.value)}
                          />
                          <Button
                            colorScheme={'green'}
                            bg={loading ? 'gray' : '#804AE1'}
                            rounded={'full'}
                            _active={loading}
                            px={6}
                            _hover={{
                              bg: 'purple.800',
                            }}
                            onClick={() => generateClaim(issuerDID, userDID)}
                          >
                            {loading ? status : 'Create Proof of Follower VC'}
                          </Button>
                          {jsonLD && qrCode && (
                            <Image src={qrCode} alt='QR Code' />
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  </Center>
                </>
              )}
            </Flex>
          </Stack>
        </Stack>
      </Container>
    </>
  )
}
