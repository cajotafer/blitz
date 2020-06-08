import {useQuery} from 'blitz'
import {ArrowLeft, Folder, X} from 'heroicons-react'
import {FC, Suspense, useCallback, useState} from 'react'
import ReactTooltip from 'react-tooltip'

import getDirectory, {_File} from 'app/queries/getDirectory'
import importProjects from 'app/mutations/importProjects'

// base = ['usr']
type UseStackReturn = [
  string,
  {
    pop: () => void
    push: (value: any) => void
  },
]

const useStack = (base: string[] = []): UseStackReturn => {
  const [stack, setStack] = useState(base)

  const pop = useCallback(() => {
    let rest = stack
    const last = stack.pop()
    setStack([...rest])

    return last
  }, [stack, setStack])

  const push = useCallback((value) => {
    setStack((stack) => [...stack, value])
  }, [])

  const resolve = useCallback(() => {
    return '/' + stack.join('/')
  }, [stack])

  return [resolve(), {pop, push}]
}

type UseListReturn = [
  {get: (filter?: string) => string[]},
  {
    remove: (filter: string) => void
    add: (entry: string) => void
    toggle: (toToggle: string) => void
  },
]

const useList = (base: any[] = []): UseListReturn => {
  const [list, setList] = useState(base)

  const remove = useCallback(
    (filter: string) => {
      console.log(
        'Removing from selected: ',
        filter,
        list.filter((str) => str !== filter),
      )
      setList((list) => [...list.filter((str) => str !== filter)])
    },
    [setList],
  )

  const add = useCallback(
    (entry: string) => {
      console.log('Adding to selected: ', entry)
      setList((list) => [...list, entry])
    },
    [setList],
  )

  const get = useCallback(
    (filter?: string) => {
      console.log(list)
      return filter ? list.filter((str) => filter === str) : list
    },
    [list],
  )

  const toggle = useCallback(
    (toToggle: string) => {
      const subject = list.filter((str) => toToggle === str)[0]
      console.log(list, subject)
      if (subject) {
        remove(toToggle)
      } else {
        add(toToggle)
      }
    },
    [get, add, remove],
  )

  return [{get}, {remove, add, toggle}]
}

type DirectoriesProps = {
  path: string
  selected: {get: (filter: string) => string[]}
  onClickFile: (path: string) => void
  onClickSelect: (name: string) => void
}

const Directories: FC<DirectoriesProps> = ({path, selected, onClickFile, onClickSelect}) => {
  const [content] = useQuery(getDirectory, path)

  const _onClickFile = (file: _File) => {
    // Prevent entering the blitz project folder
    if (file.isFolder && !file.isRestricted && !file.isBlitzProject) {
      onClickFile(file.name)
    } else if (file.isBlitzProject) {
      onClickSelect(path + '/' + file.name)
    }
  }

  const isSelected = (file: _File) => {
    return !!selected.get(path + '/' + file.name)[0]
  }

  return (
    content && (
      <div className="flex-1 pt-2">
        {content.message}
        {content.files &&
          content.files.map(
            (directory: _File) =>
              directory.isFolder &&
              !directory.isRestricted && (
                <div
                  className="flex flex-row p-2 mx-2 font-medium text-gray-600 rounded-md cursor-pointer hover:font-bold hover:bg-gray-100 hover:text-indigo-600"
                  onClick={() => _onClickFile(directory)}>
                  <span className="flex flex-row">
                    {directory.isFolder && !directory.isBlitzProject && <Folder className="mr-2" />}
                    {directory.isBlitzProject && (
                      <div className="p-1 mr-2 bg-indigo-600 rounded-md">
                        <img
                          className="w-5 h-5"
                          src="/img/logos/blitz-mark-on-dark.svg"
                          alt={`Blitz Project ${directory.name}`}
                        />
                      </div>
                    )}
                    {directory.name}
                  </span>
                  {directory.isBlitzProject && isSelected(directory) && (
                    <div
                      className="flex items-center justify-center px-2 ml-6 text-xs font-bold text-indigo-500 bg-indigo-100 rounded-md select-none"
                      style={{letterSpacing: 1.2}}>
                      SELECTED
                    </div>
                  )}
                </div>
              ),
          )}
      </div>
    )
  )
}

type FileBrowserProps = {
  close: () => void
}

export const FileBrowser: FC<FileBrowserProps> = ({close}) => {
  const [path, {pop, push}] = useStack()
  const [selected, {toggle}] = useList()

  const _importProjects = async () => {
    try {
      const projects = await importProjects({projects: selected.get()})

      if (projects) {
        alert('Import completed!')
        console.log('Imported these: ', projects)
        close()
      } else {
        alert('Import failed!')
        close()
      }
    } catch (e) {
      alert('Something failed :(')
      console.error(e)
    }
  }

  return (
    <div
      className="relative flex flex-row w-full max-w-6xl mx-auto bg-white rounded-lg"
      style={{height: '50%', maxHeight: '50%', zIndex: 9999}}>
      <div className="flex-1 max-w-xs px-4 py-1 bg-gray-100 rounded-l-md">
        <h2 className="py-2 pl-5 -mx-4 -mt-1 font-bold text-gray-500 rounded-tl-md">Selected</h2>
        <div>
          {selected.get().map((path) => (
            <>
              <div
                className="relative flex flex-row p-2 my-2 text-sm font-semibold text-white bg-indigo-600 rounded-md cursor-pointer"
                data-tip={path}>
                <img
                  className="w-5 h-5 mr-3"
                  src="/img/logos/blitz-mark-on-dark.svg"
                  alt={`Selected Blitz Project on ${path}`}
                />
                <p>{path.slice(path.lastIndexOf('/') + 1)}</p>
                <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-end opacity-0 hover:opacity-100 ">
                  <X className="w-1/4 h-full p-1 bg-indigo-800 rounded-r-md" onClick={() => toggle(path)} />
                </div>
              </div>
              <ReactTooltip place="right" type="dark" effect="solid" />
            </>
          ))}
        </div>
      </div>
      <div className="relative flex flex-col flex-1 h-full overflow-y-auto rounded-r-lg">
        <div
          className="sticky top-0 flex flex-row items-center w-full pl-6 font-medium text-gray-500 bg-white border-b border-gray-200 rounded-tr-md"
          style={{minHeight: 40}}>
          {path !== '/' && (
            <div
              className="h-full py-2 pl-6 mr-2 -my-2 -ml-6 text-indigo-600 cursor-pointer hover:bg-purple-100 rounded-r-md"
              onClick={pop}>
              <ArrowLeft className="w-5 h-5 mr-2" />
            </div>
          )}
          {path}
        </div>
        <Suspense fallback={<div className="flex-1">Loading...</div>}>
          <Directories path={path} selected={selected} onClickFile={push} onClickSelect={toggle} />
        </Suspense>
        <div className="sticky bottom-0 px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
          <span className="flex w-full rounded-md shadow-sm sm:ml-3 sm:w-auto">
            <button
              onClick={_importProjects}
              type="submit"
              className="inline-flex justify-center w-full px-4 py-2 text-base font-medium leading-6 text-white transition duration-150 ease-in-out bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo sm:text-sm sm:leading-5 disabled:opacity-50"
              disabled={selected.get().length <= 0}>
              Import
            </button>
          </span>
          <span className="flex w-full mt-3 rounded-md shadow-sm sm:mt-0 sm:w-auto">
            <button
              onClick={close}
              type="button"
              className="inline-flex justify-center w-full px-4 py-2 text-base font-medium leading-6 text-gray-700 transition duration-150 ease-in-out bg-white border border-gray-300 rounded-md shadow-sm hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue sm:text-sm sm:leading-5">
              Cancel
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}