import { CID } from 'multiformats/cid'
import { base16 } from "multiformats/bases/base16"
// import * as json from 'multiformats/codecs/json'
import * as dagPB from '@ipld/dag-pb'
import { sha256 } from 'multiformats/hashes/sha2'
import fs from 'fs'


async function run () { 
let cid = await CID.parse("bafybeie34mira4kzmv7744dify5thxfptfhnmc5qv7mvjw65rl5bf4jz4u")
console.log(cid.toString(base16))
}

// let data = JSON.parse(fs.readFileSync('./metadata/BIA.json', 'utf-8'))



// async function run () {
//     const bytes = dagPB.encode({
//         Data: new TextEncoder().encode(data),
//         Links: []
//     })
  
//     // also possible if you `import dagPB, { prepare } from '@ipld/dag-pb'`
//     // const bytes = dagPB.encode(prepare('Some data as a string'))
//     // const bytes = dagPB.encode(prepare(new TextEncoder().encode('Some data as a string')))
  
//     const hash = await sha256.digest(bytes)
//     const cid = CID.create(1, dagPB.code, hash)
//     console.log(cid)
//     console.log(cid, '=>', Buffer.from(bytes).toString('hex'))
  
//     const decoded = dagPB.decode(bytes)
  
//     console.log(decoded)
//     console.log(`decoded "Data": ${new TextDecoder().decode(decoded.Data)}`)
//   }
  
//   run().catch((err) => {
//     console.error(err)
//     process.exit(1)
//   })

run().catch((err) => {
        console.error(err)
        process.exit(1)
      })