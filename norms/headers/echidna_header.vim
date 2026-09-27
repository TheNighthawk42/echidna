" ============================================================================
" Echidna Header — Vim/Neovim equivalent of the VSCode extension
" Install: drop this file in ~/.vim/plugin/ (Vim) or
"          ~/.config/nvim/plugin/ (Neovim), then restart.
" Usage:   press Ctrl+H in normal mode to insert/refresh the header.
"          Saving the file (:w) auto-refreshes the UPDATED timestamp.
" ============================================================================

if !exists('g:echidna_login')
  let g:echidna_login = toupper(substitute($USER, '^.', '\u&', ''))
endif
if !exists('g:echidna_project_name')
  let g:echidna_project_name = 'E_PROTOCOL'
endif

let s:width = 115

function! s:Pad(text)
  let l:line = '/* ' . a:text
  let l:pad = s:width - strchars(l:line) - 3
  if l:pad < 1
    let l:pad = 1
  endif
  return l:line . repeat(' ', l:pad) . '*/'
endfunction

function! s:Branch()
  let l:b = system('git rev-parse --abbrev-ref HEAD 2>/dev/null')
  let l:b = substitute(l:b, '\n', '', '')
  return empty(l:b) ? '' : l:b
endfunction

function! s:Now()
  return strftime('%-d/%-m/%Y(%-I:%M %p)')
endfunction

function! s:DirName()
  return toupper(fnamemodify(expand('%:p:h'), ':t'))
endfunction

function! s:FileName()
  return toupper(expand('%:t'))
endfunction

function! EchidnaInsertHeader()
  let l:now = s:Now()
  let l:dir = s:DirName()
  let l:file = s:FileName()
  let l:header = [
        \ repeat('/* ', 0) . '/* ' . repeat('*', s:width - 6) . ' */',
        \ s:Pad('PROJECT NAME: ' . g:echidna_project_name . ';'),
        \ s:Pad('BRANCHE: ' . s:Branch()),
        \ s:Pad('LOGIN:  ' . g:echidna_login),
        \ s:Pad('DIRECTORY_NAME(' . l:dir . ')    CREATED: ' . l:now . '  UPDATED ' . l:now),
        \ s:Pad('FILE_NAME(' . l:file . ')            CREATED: ' . l:now . '  UPDATED  ' . l:now),
        \ s:Pad(''),
        \ '/* ' . repeat('*', s:width - 6) . ' */',
        \ ]
  call append(0, l:header)
endfunction

function! EchidnaUpdateHeader()
  let l:now = s:Now()
  let l:lnum = search('^/\* FILE_NAME(', 'n')
  if l:lnum == 0
    return
  endif
  " Replace only the UPDATED timestamp on the FILE_NAME line
  let l:line = getline(l:lnum)
  let l:new = substitute(l:line, 'UPDATED\s\+\zs.\{-}\ze\s*\*/', l:now, '')
  call setline(l:lnum, l:new)
endfunction

augroup EchidnaHeader
  autocmd!
  autocmd BufWritePre * silent! call EchidnaUpdateHeader()
augroup END

nnoremap <silent> <C-h> :call EchidnaInsertHeader()<CR>
