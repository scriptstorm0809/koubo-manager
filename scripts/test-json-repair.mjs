/**
 * Standalone test: JSON repair logic for AI-generated content.
 * Run: node scripts/test-json-repair.mjs
 */

// --- stripped copies of the repair functions from ai-script-generator.ts ---

function stripMarkdownCodeBlock(raw) {
  let text = raw.trim()
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim()
  }
  return text
}

function repairTruncatedJson(text) {
  let repaired = text.replace(/\\$/g, '')
  if (repaired.endsWith('{') || repaired.endsWith('[') || repaired.endsWith(',')) {
    repaired = repaired.replace(/,\s*$/, '')
  }

  const unescapedDoubleQuotes = (repaired.match(/(?<!\\)"/g) || []).length

  if (unescapedDoubleQuotes % 2 !== 0) {
    repaired += '"'
  }

  const bracketStack = []
  let insideString = false
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i]
    if (ch === '"' && repaired[i - 1] !== '\\') {
      insideString = !insideString
    } else if (!insideString) {
      if (ch === '{' || ch === '[') {
        bracketStack.push(ch)
      } else if (ch === '}' || ch === ']') {
        const expected = bracketStack[bracketStack.length - 1]
        if ((ch === '}' && expected === '{') || (ch === ']' && expected === '[')) {
          bracketStack.pop()
        }
      }
    }
  }

  while (bracketStack.length > 0) {
    const last = bracketStack.pop()
    repaired += last === '{' ? '}' : ']'
  }

  return repaired
}

function repairJson(raw) {
  let text = raw.trim()

  // Find the outermost { ... } by balancing braces
  let depth = 0
  let braceStart = -1
  let braceEnd = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') {
      if (depth === 0) braceStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        braceEnd = i + 1
        break
      }
    }
  }

  if (braceStart >= 0 && braceEnd > braceStart) {
    text = text.slice(braceStart, braceEnd)
  }

  text = text.replace(/,(\s*[}\]])/g, '$1')
  text = text.replace(/"(\s*)(?=")/g, (_, whitespace) => `",${whitespace}`)
  text = text.replace(/,\s*,/g, ',')

  return text
}

function detectTruncation(content) {
  const trimmed = content.trim()
  if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) return true
  try {
    JSON.parse(trimmed)
    return false
  } catch {
    return true
  }
}

// --- Test cases ---

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}: ${e.message}`)
  }
}

function assertValidJson(str, label) {
  try {
    JSON.parse(str)
  } catch (e) {
    throw new Error(`${label}: ${e.message}\n  Content: ${str.slice(0, 200)}`)
  }
}

function assertContains(str, substring, label) {
  if (!str.includes(substring)) {
    throw new Error(`${label}: expected to contain "${substring}"`)
  }
}

console.log('\n=== stripMarkdownCodeBlock ===')

test('removes ```json wrapper', () => {
  const input = '```json\n{"scripts": [{"title": "test"}]}\n```'
  const result = stripMarkdownCodeBlock(input)
  assertValidJson(result, 'after strip')
})

test('removes plain ``` wrapper', () => {
  const input = '```\n{"scripts": [{"title": "test"}]}\n```'
  const result = stripMarkdownCodeBlock(input)
  assertValidJson(result, 'after plain strip')
})

test('passes through clean JSON', () => {
  const input = '{"scripts": [{"title": "test"}]}'
  const result = stripMarkdownCodeBlock(input)
  assertValidJson(result, 'pass through')
})

console.log('\n=== repairJson ===')

test('fixes trailing comma before }', () => {
  const input = '{"scripts": [{"title": "test",},]}'
  const result = repairJson(input)
  assertValidJson(result, 'trailing comma before }')
  const parsed = JSON.parse(result)
  if (parsed.scripts[0].title !== 'test') throw new Error('data lost')
})

test('fixes trailing comma in array before ]', () => {
  const input = '{"scripts": [{"title": "test",},]}'
  // The inner trailing comma: ,} should be fixed by the ,(\s*[}\]]) pattern
  // But let's test array-level: [1, 2,]
  const result = repairJson('[1, 2,]')
  assertValidJson(result, 'array trailing comma')
})

test('inserts missing comma between adjacent strings', () => {
  // Simulating "value1""value2" pattern from AI output
  const input = '{"items":["a""b"]}'
  const result = repairJson(input)
  assertValidJson(result, 'adjacent strings')
  const parsed = JSON.parse(result)
  if (parsed.items[0] !== 'a') throw new Error('first value wrong')
  if (parsed.items[1] !== 'b') throw new Error('second value wrong')
})

test('fixes double comma', () => {
  const input = '{"a": 1,, "b": 2}'
  const result = repairJson(input)
  assertValidJson(result, 'double comma')
})

test('strips text before JSON', () => {
  const input = 'Here is the result: {"scripts": [{"title": "test"}]} and more text'
  const result = repairJson(input)
  assertValidJson(result, 'stripped text')
})

test('handles complex real-world valid JSON', () => {
  const input = JSON.stringify({
    scripts: [
      {
        title: '测试标题',
        slug: 'test-slug',
        source_topic: '测试选题',
        estimated_duration: '1m30s',
        content: '这是口播正文内容。',
        sources: [{ title: '来源标题', url: 'https://example.com', evidence: '证据说明' }],
        viral_review: {
          score: 9,
          opening_hook: '很好的钩子',
          conflict_or_gap: '冲突点',
          viewer_benefit: '观众收益',
          plain_language_check: '通俗易懂',
          broad_audience_fit: '广泛适用',
          too_niche: false,
          revision_note: '无需修改',
        },
      },
    ],
  })
  const result = repairJson(input)
  assertValidJson(result, 'complex valid JSON')
})

console.log('\n=== detectTruncation ===')

test('detects truncated JSON (ends mid-string)', () => {
  const input = '{"scripts":[{"title":"test'
  const result = detectTruncation(input)
  if (result !== true) throw new Error('should detect truncation')
})

test('detects valid JSON as complete', () => {
  const input = '{"scripts": [{"title": "test"}]}'
  const result = detectTruncation(input)
  if (result !== false) throw new Error('should not detect truncation')
})

console.log('\n=== repairTruncatedJson ===')

test('closes unclosed string mid-value', () => {
  // Simulating the actual error: model cut off mid-source title
  const input = '{"scripts":[{"title":"test","sources":[{"title":"Apple"'
  const result = repairTruncatedJson(input)
  assertValidJson(result, 'truncated string closed')
  const parsed = JSON.parse(result)
  if (parsed.scripts[0].sources[0].title !== 'Apple') throw new Error('data lost')
})

test('closes unclosed array and object', () => {
  const input = '{"scripts":[{"title":"test"'
  const result = repairTruncatedJson(input)
  assertValidJson(result, 'unclosed array/object')
  const parsed = JSON.parse(result)
  if (parsed.scripts[0].title !== 'test') throw new Error('data lost')
})

test('handles truncated nested structure', () => {
  const input = '{"scripts":[{"title":"t1","sources":[{"url":"http'
  const result = repairTruncatedJson(input)
  assertValidJson(result, 'nested truncation')
  const parsed = JSON.parse(result)
  if (parsed.scripts[0].sources[0].url !== 'http') throw new Error('data lost')
})

test('handles truncated with escaped backslash', () => {
  const input = '{"scripts":[{"title":"test\\'
  const result = repairTruncatedJson(input)
  assertValidJson(result, 'escaped backslash truncation')
  const parsed = JSON.parse(result)
  if (parsed.scripts[0].title !== 'test') throw new Error('data lost')
})

console.log('\n=== Integration: Full parse flow ===')

test('full flow: markdown + truncation + repair', () => {
  const input = '```json\n{"scripts":[{"title":"t1","content":"好的","sources":[{"title":"src"\n```'
  const clean = stripMarkdownCodeBlock(input)
  // clean = {"scripts":[{"title":"t1","content":"好的","sources":[{"title":"src"
  const repaired = repairTruncatedJson(clean)
  assertValidJson(repaired, 'full flow')
  const parsed = JSON.parse(repaired)
  if (parsed.scripts.length !== 1) throw new Error('wrong script count')
  if (parsed.scripts[0].sources[0].title !== 'src') throw new Error('source data lost')
})

test('full flow: real error scenario from user (position 2323)', () => {
  // Reconstructed scenario: array element missing comma or trailing comma
  const input = `{"scripts":[{"title":"测试","slug":"test","source_topic":"出海","estimated_duration":"1m","content":"正文",}],"sources":[]}`
  const repaired = repairJson(input)
  assertValidJson(repaired, 'user scenario')
  const parsed = JSON.parse(repaired)
  if (parsed.scripts[0].title !== '测试') throw new Error('data lost')
})

console.log('\n' + '='.repeat(50))
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log('='.repeat(50))

process.exit(failed > 0 ? 1 : 0)
