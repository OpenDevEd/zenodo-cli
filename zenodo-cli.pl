#!/usr/bin/perl
system("npm","run","build");
system("npm","start","--",@ARGV);
