let careerFilter = function () {}

function insertPlacesSelect(table) {
  table
    .api()
    .columns([2])
    .every(function () {
      let placesColumn = this
      let placesSelect = $(
        '<select id="placesSelect" class="cell auto"><option value="" hidden>Local</option><option value=""></option></select>'
      )
        .prependTo($('#filters'))
        .on('change', function () {
          let value = $.fn.dataTable.util.escapeRegex($(this).val())
          placesColumn
            .search(value ? '^' + value + '$' : '', true, false)
            .draw()
          if (value === '') {
            placesSelect.prop('selectedIndex', 0)
          }
        })
      placesColumn
        .data()
        .unique()
        .sort()
        .each((value) =>
          placesSelect.append(
            '<option value="' + value + '">' + value + '</option>'
          )
        )
    })
}

function getHtml(url) {
  return new Promise((resolve) => {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'document'
    xhr.onload = (e) => resolve(e.target.response)
    xhr.send()
  })
}

function updateCareerList(html) {
  let careerSelect = $('#careerSelect')
  let careers = $('.linkb > li', html)

  careers = Array.prototype.map.call(careers, (career) => {
    return {
      name: career.textContent.substring(career.textContent.indexOf(' ') + 1),
      url: career.querySelector('a').href,
    }
  })

  careers.sort((careerA, careerB) =>
    careerA.name < careerB.name ? -1 : careerA.name > careerB.name ? 1 : 0
  )
  careers.forEach((career) =>
    careerSelect.append(
      '<option value="' + career.url + '">' + career.name + '</option>'
    )
  )
}

function filterByCareer(html, table) {
  let exams = html.querySelectorAll('.fa > .ca, .na > .ca')
  let examsUrls = Array.prototype.map.call(
    exams,
    (exam) => exam.querySelector('a').href
  )

  if ($.fn.dataTable.ext.search.indexOf(careerFilter) != -1) {
    $.fn.dataTable.ext.search.splice(
      $.fn.dataTable.ext.search.indexOf(careerFilter),
      1
    )
  }

  careerFilter = (settings, searchData, index, rowData, counter) =>
    examsUrls.includes(rowData.url) ? true : false

  $.fn.dataTable.ext.search.push(careerFilter)
  table.fnDraw()
}

function insertCareerSelect(table) {
  let careerSelect = $(
    '<select id="careerSelect" class="cell auto"><option value="" hidden>Cargo</option><option value=""></option></select>'
  )
    .prependTo($('#filters'))
    .on('change', function () {
      let url = $(this).val()
      if (url != '') {
        getHtml(url).then((html) => filterByCareer(html, table))
      } else {
        if ($.fn.dataTable.ext.search.indexOf(careerFilter) != -1) {
          $.fn.dataTable.ext.search.splice(
            $.fn.dataTable.ext.search.indexOf(careerFilter),
            1
          )
        }
        table.fnDraw()
      }
    })
  getHtml('https://www.pciconcursos.com.br/vagas/').then((html) =>
    updateCareerList(html)
  )
}

browser.storage.local.get('syncedExams').then(({ syncedExams }) =>
  $(document).ready(() =>
    $('#examsTable').DataTable({
      data: syncedExams,
      columns: [
        {
          data: null,
          title: 'Instituição',
          render: (data) =>
            "<a href='" + data.url + "'>" + data.institution + '</a>',
        },
        { data: 'vacancies', title: 'Vagas' },
        { data: 'place', title: 'Local' },
        {
          data: 'updatedAt',
          title: 'Atualização',
          render: (data, type) =>
            type === 'filter' || type === 'display'
              ? new Date(data).toLocaleDateString() ===
                new Date().toLocaleDateString()
                ? 'Hoje'
                : new Date(data).toLocaleDateString()
              : data,
        },
      ],
      columnDefs: [{ className: 'text-center', targets: [1, 2, 3] }],
      order: [
        [3, 'desc'],
        [2, 'asc'],
        [1, 'desc'],
        [0, 'asc'],
      ],
      dom: '<"#filters.grid-x"f>' + 't' + 'p',
      language: {
        url: 'Portuguese-Brasil.json',
      },
      initComplete: function () {
        insertCareerSelect(this)
        insertPlacesSelect(this)
        $('#examsTable_filter').addClass('cell auto')
      },
    })
  )
)
