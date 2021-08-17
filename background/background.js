function getHtml(url) {
  return new Promise((resolve) => {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'document'
    xhr.onload = (e) => resolve(e.target.response)
    xhr.send()
  })
}

function getData(html) {
  let exams = html.querySelectorAll('.fa > .ca, .na > .ca')

  return Array.prototype.map.call(exams, (exam) => {
    return {
      institution: exam.querySelector('a').textContent,
      url: exam.querySelector('a').href,
      place:
        exam.querySelector('.cc').textContent === '\xa0'
          ? $(exam.querySelector('.cc'))
              .parent()
              .parent()
              .prevAll('.ua:first')
              .children()
              .first()
              .text()
              .replace('REGIÃO ', '')
          : exam.querySelector('.cc').textContent,
      vacancies: (() => {
        let match = exam
          .querySelector('.cd')
          .textContent.match(/(\d+[\.\d{3}]*) vaga/)
        return match ? match[1].replace('.', '') : '-'
      })(),
      updatedAt: Date.now(),
    }
  })
}

async function getExams(urls, exams) {
  for (const url of urls) {
    let html = await getHtml(url)
    exams.push(...getData(html))
  }
}

function getNotOutdatedExams(exams, syncedExams) {
  return syncedExams.filter(({ url: urlA }) =>
    exams.some(({ url: urlB }) => urlA === urlB)
  )
}

function getNewExams(exams, syncedExams) {
  return exams.filter(
    ({ url: urlA }) => !syncedExams.some(({ url: urlB }) => urlA === urlB)
  )
}

function checkExams() {
  const urls = [
    'https://www.pciconcursos.com.br/concursos/nacional/',
    'https://www.pciconcursos.com.br/concursos/sudeste/',
    'https://www.pciconcursos.com.br/concursos/sul/',
    'https://www.pciconcursos.com.br/concursos/centrooeste/',
    'https://www.pciconcursos.com.br/concursos/norte/',
    'https://www.pciconcursos.com.br/concursos/nordeste/',
  ]

  let exams = []

  browser.storage.local.get('syncedExams').then(({ syncedExams }) =>
    getExams(urls, exams)
      .then(() => (syncedExams = getNotOutdatedExams(exams, syncedExams)))
      .then(
        () =>
          (newExams = getNewExams(exams, syncedExams).filter(
            (currentValue, index, array) =>
              index ===
              array.findIndex((element) => element.url === currentValue.url)
          ))
      )
      .then(() =>
        browser.storage.local.set({
          syncedExams: syncedExams.concat(newExams),
        })
      )
      .then(
        () =>
          newExams.length &&
          browser.notifications.create({
            type: 'basic',
            title: newExams.length + ' concursos foram atualizados',
            message: [
              ...new Set(
                newExams
                  .sort(
                    ({ vacancies: vacanciesA }, { vacancies: vacanciesB }) =>
                      (parseInt(vacanciesA) || 0) > (parseInt(vacanciesB) || 0)
                        ? -1
                        : (parseInt(vacanciesA) || 0) <
                          (parseInt(vacanciesB) || 0)
                        ? 1
                        : 0
                  )
                  .map((exams) => exams.institution)
              ),
            ].join('\n'),
            iconUrl: '../icons/notification.png',
          })
      )
  )
}

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    browser.storage.local.set({ syncedExams: [] })
  }
})

browser.alarms.create('checkExams', {
  when: Date.now(),
  periodInMinutes: 60,
})

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkExams') {
    checkExams()
  }
})
