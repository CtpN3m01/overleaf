import { vi, expect, describe, beforeEach, it } from 'vitest'
import sinon from 'sinon'
import path from 'node:path'

const MODULE_PATH = path.join(
  import.meta.dirname,
  '../../../app/js/LatexPackageAutoInstaller'
)

describe('LatexPackageAutoInstaller', () => {
  beforeEach(async ctx => {
    ctx.Settings = {
      clsi: {
        autoInstallMissingLatexPackages: {
          enabled: true,
          maxRetries: 3,
        },
      },
    }
    ctx.logger = {
      info: sinon.stub(),
      warn: sinon.stub(),
    }
    ctx.childProcess = {
      execFile: sinon.stub(),
    }

    vi.doMock('@overleaf/settings', () => ({
      default: ctx.Settings,
    }))

    vi.doMock('@overleaf/logger', () => ({
      default: ctx.logger,
    }))

    vi.doMock('child_process', () => ({
      execFile: ctx.childProcess.execFile,
    }))

    ctx.LatexPackageAutoInstaller = (await import(MODULE_PATH)).default
  })

  it('should detect the missing file name from latex output', ctx => {
    expect(
      ctx.LatexPackageAutoInstaller.extractMissingLatexFile({
        stdout: "LaTeX Error: File `algorithmic.sty' not found.",
      })
    ).to.equal('algorithmic.sty')
  })

  it('should install a missing package via apt-file when available', async ctx => {
    ctx.childProcess.execFile
      .withArgs('which', ['tlmgr'], sinon.match.any, sinon.match.func)
      .yields(new Error('missing tlmgr'))
    ctx.childProcess.execFile
      .withArgs('which', ['apt-file'], sinon.match.any, sinon.match.func)
      .yields(null, '/usr/bin/apt-file\n', '')
    ctx.childProcess.execFile
      .withArgs('which', ['apt-get'], sinon.match.any, sinon.match.func)
      .yields(null, '/usr/bin/apt-get\n', '')
    ctx.childProcess.execFile
      .withArgs(
        'apt-file',
        ['search', '--regexp', '(^|/)algorithmic\\.sty$'],
        sinon.match.any,
        sinon.match.func
      )
      .yields(
        null,
        'texlive-science: /usr/share/texlive/texmf-dist/tex/latex/algorithms/algorithmic.sty\n',
        ''
      )
    ctx.childProcess.execFile
      .withArgs('apt-get', ['update'], sinon.match.any, sinon.match.func)
      .yields(null, '', '')
    ctx.childProcess.execFile
      .withArgs(
        'apt-get',
        ['install', '-y', '--no-install-recommends', 'texlive-science'],
        sinon.match.any,
        sinon.match.func
      )
      .yields(null, '', '')

    const result =
      await ctx.LatexPackageAutoInstaller.promises.installMissingPackageFromOutput(
        'project-1',
        {
          stdout: "LaTeX Error: File `algorithmic.sty' not found.",
        }
      )

    expect(result).to.deep.equal({
      installer: 'apt',
      missingFile: 'algorithmic.sty',
      packages: ['texlive-science'],
    })
  })

  it('should return null when the output has no missing package error', async ctx => {
    const result =
      await ctx.LatexPackageAutoInstaller.promises.installMissingPackageFromOutput(
        'project-1',
        {
          stdout: 'This compile failed for another reason.',
        }
      )

    expect(result).to.equal(null)
    expect(ctx.childProcess.execFile).not.to.have.been.called
  })
})
