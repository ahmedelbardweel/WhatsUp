<?php

namespace App;

use Illuminate\Foundation\Application as BaseApplication;

class Application extends BaseApplication
{
    /**
     * Override bootstrap path to use /tmp on Vercel (read-only filesystem)
     */
    public function bootstrapPath($path = '')
    {
        // On Vercel, use /tmp for writable bootstrap cache
        if (isset($_ENV['VERCEL']) || getenv('VERCEL') || !is_writable($this->basePath)) {
            $bootstrapPath = '/tmp/bootstrap';
        } else {
            $bootstrapPath = $this->basePath . DIRECTORY_SEPARATOR . 'bootstrap';
        }

        return $bootstrapPath . ($path != '' ? DIRECTORY_SEPARATOR . $path : '');
    }
}
