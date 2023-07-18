import axios from 'axios'

const PID_API_URL = 'http://127.0.0.1:3001/v1/'
const username = 'user-issuer'
const password = 'password-issuer'

const paths = {
  identities: 'identities',
  publishOnChain: (did) => `${did}/state/publish`,
  createClaim: (did) => `${did}/claims`,
  createClaim: (did) => `${did}/claims`,
  claimQrCode: (did, claimId) => `${did}/claims/${claimId}/qrcode`,
}
const headersConfig = {
  Authorization: 'Basic ' + btoa(username + ':' + password),
  'Access-Control-Allow-Origin': 'http://localhost:3001',
  'Content-Type': 'application/json',
}

export const createIdentity = async (body) =>
  await axios({
    method: 'POST',
    url: `${PID_API_URL}${paths.identities}`,
    data: body,
    headers: headersConfig,
  })

export const createClaim = async (
  issuerDID,
  userDID,
  lensID,
  lensfollowers
) => {
  const body = {
    credentialSchema:
      'https://raw.githubusercontent.com/teeolendo/lens-id/main/schemas/lensfollowers.json',
    type: 'lensfollowers',
    credentialSubject: {
      id: userDID,
      lensfollowers: lensID,
      lensid: lensfollowers,
    },
    expiration: 1680532130,
  }

  return await axios({
    method: 'POST',
    url: `${PID_API_URL}${paths.createClaim(issuerDID)}`,
    data: body,
    headers: headersConfig,
  })
}

export const claimQrCode = async (did, claimId) =>
  await axios({
    method: 'GET',
    url: `${PID_API_URL}${paths.claimQrCode(did, claimId)}`,
    headers: headersConfig,
  })

export const generateQRCode = async (jsonLD) => {
  const body = {
    apikey: process.env.NEXT_PUBLIC_QRIO_API_KEY,
    data: JSON.stringify(jsonLD),
    transparent: 'on',
    frontcolor: '#000000',
    marker_out_color: '#000000',
    marker_in_color: '#000000',
    pattern: 'default',
    marker: 'default',
    marker_in: 'default',
    optionlogo: 'none',
  }

  return await axios({
    method: 'POST',
    url: 'https://api.qr.io/v1/create',
    data: body,
  })
}
