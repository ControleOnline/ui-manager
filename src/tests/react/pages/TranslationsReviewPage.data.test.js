const assert = require('node:assert/strict')
const test = require('node:test')

const {
  buildOverviewFromTranslateCollections,
  isNotFoundError,
} = require('../../../react/pages/TranslationsReviewPage.data')

test('builds overview rows with fallback and company override data', () => {
  const result = buildOverviewFromTranslateCollections({
    companyTranslations: [
      {
        id: 20,
        store: 'orders',
        type: 'label',
        key: 'save',
        translate: 'Salvar empresa',
        revised: true,
        language: {id: 1, language: 'pt-br', '@id': '/languages/1'},
      },
    ],
    fallbackTranslations: [
      {
        id: 10,
        store: 'orders',
        type: 'label',
        key: 'save',
        translate: 'Salvar principal',
        revised: false,
        language: {id: 1, language: 'pt-br', '@id': '/languages/1'},
      },
      {
        id: 11,
        store: 'orders',
        type: 'label',
        key: 'cancel',
        translate: 'Cancelar principal',
        revised: false,
        language: {id: 1, language: 'pt-br', '@id': '/languages/1'},
      },
    ],
    selectedCompany: {id: 5, name: 'Filial'},
    mainCompany: {id: 1, name: 'Principal'},
    activeLanguage: 'pt-br',
  })

  assert.equal(result.member.length, 2)
  assert.equal(result.summary.total, 2)
  assert.equal(result.summary.pendingReview, 1)
  assert.equal(result.summary.reviewed, 1)
  assert.equal(result.summary.overrides, 1)
  assert.equal(result.summary.fallbacks, 1)
  assert.equal(result.member[0].key, 'cancel')
  assert.equal(result.member[0].source, 'main_company')
  assert.equal(result.member[0].pendingReview, true)
  assert.equal(result.member[1].key, 'save')
  assert.equal(result.member[1].source, 'company')
  assert.equal(result.member[1].companyTranslate, 'Salvar empresa')
  assert.equal(result.member[1].mainTranslate, 'Salvar principal')
})

test('keeps summary based on the searched collection when pending filter is active', () => {
  const result = buildOverviewFromTranslateCollections({
    companyTranslations: [],
    fallbackTranslations: [
      {
        id: 30,
        store: 'crm',
        type: 'label',
        key: 'approved',
        translate: 'Aprovado',
        revised: true,
        language: {id: 1, language: 'pt-br', '@id': '/languages/1'},
      },
      {
        id: 31,
        store: 'crm',
        type: 'label',
        key: 'pending_review',
        translate: 'Pendente',
        revised: false,
        language: {id: 1, language: 'pt-br', '@id': '/languages/1'},
      },
    ],
    selectedCompany: {id: 5, name: 'Filial'},
    mainCompany: {id: 1, name: 'Principal'},
    activeLanguage: 'pt-br',
    search: 'crm',
    pendingOnly: true,
  })

  assert.equal(result.member.length, 1)
  assert.equal(result.member[0].key, 'pending_review')
  assert.equal(result.summary.total, 2)
  assert.equal(result.summary.pendingReview, 1)
  assert.equal(result.summary.reviewed, 1)
})

test('detects 404 errors for the overview fallback path', () => {
  assert.equal(isNotFoundError({status: 404}), true)
  assert.equal(isNotFoundError({code: 404}), true)
  assert.equal(isNotFoundError({status: 500}), false)
})
