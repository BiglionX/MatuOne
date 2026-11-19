import { auditMagicModels } from '../src/pages/matupix/brick/brickMagicModels'

const result = auditMagicModels()
console.log(result.counts.join('\n'))
console.log('---')
console.log(result.problems.length ? result.problems.join('\n') : 'ALL CLEAR')
