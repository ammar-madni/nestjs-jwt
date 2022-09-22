import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { GetCurrentUser, Public } from 'src/common/decorators';
import { RefreshTokenGuard } from 'src/auth/guards';
import { CreateUserDto } from 'src/users/dto';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { Tokens } from './types';
import { LocalGuard } from './guards/local.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() newUser: CreateUserDto): Promise<Tokens> {
    return this.authService.register(newUser);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() userCredentials: AuthDto): Promise<Tokens> {
    return this.authService.login(userCredentials);
  }

  @Post('login-local')
  @UseGuards(LocalGuard)
  @HttpCode(HttpStatus.OK)
  loginLocal(@Request() request) {}

  @Post('logout')
  @Public()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  logout(
    @GetCurrentUser() userId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ) {
    return this.authService.logout(userId, refreshToken);
  }

  @Post('refresh-tokens')
  @Public()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  refreshTokens(
    @GetCurrentUser() userId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ): Promise<Tokens> {
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
